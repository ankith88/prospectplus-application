import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/visit_note.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../../theme/app_theme.dart';

class VisitNoteProcessorDialog extends StatefulWidget {
  final VisitNote note;
  final Function(String noteId, String status, String? leadId) onProcessed;

  const VisitNoteProcessorDialog({
    super.key,
    required this.note,
    required this.onProcessed,
  });

  @override
  State<VisitNoteProcessorDialog> createState() => _VisitNoteProcessorDialogState();
}

class _VisitNoteProcessorDialogState extends State<VisitNoteProcessorDialog> {
  final FirestoreService _firestoreService = FirestoreService();
  bool _isRejecting = false;
  bool _isLinking = false;
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  Map<String, dynamic>? _selectedItem;

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _handleSearch(String query) async {
    if (query.length < 3) {
      if (mounted) {
        setState(() {
          _searchResults = [];
        });
      }
      return;
    }

    setState(() {
      _isSearching = true;
    });

    try {
      final leads = await _firestoreService.getLeads().first;
      final companies = await _firestoreService.getCompanies();

      final normalizedQuery = query.toLowerCase();

      final filteredLeads = leads
          .where((l) => l.companyName.toLowerCase().contains(normalizedQuery))
          .map((l) => {'item': l, 'isCompany': false})
          .toList();

      final filteredCompanies = companies
          .where((c) => c.companyName.toLowerCase().contains(normalizedQuery))
          .map((c) => {'item': c, 'isCompany': true})
          .toList();

      if (mounted) {
        setState(() {
          _searchResults = List<Map<String, dynamic>>.from([...filteredLeads, ...filteredCompanies].take(15));
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error searching for records')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSearching = false;
        });
      }
    }
  }

  Future<void> _handleReject() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Rejection'),
        content: const Text('Are you sure you want to reject this visit note?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Reject'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isRejecting = true;
    });

    try {
      await _firestoreService.updateVisitNote(widget.note.id, {'status': 'Rejected'});
      widget.onProcessed(widget.note.id, 'Rejected', null);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error rejecting note')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isRejecting = false;
        });
      }
    }
  }

  Future<void> _handleLink() async {
    if (_selectedItem == null) return;

    setState(() {
      _isLinking = true;
    });

    try {
      final item = _selectedItem!['item'] as Lead;
      final isCompany = _selectedItem!['isCompany'] as bool;

      await _firestoreService.updateVisitNote(widget.note.id, {
        'status': 'Converted',
        'leadId': item.id,
      });

      if (isCompany) {
        await _firestoreService.updateCompanyData(item.id, {'visitNoteID': widget.note.id});
      } else {
        await _firestoreService.updateLeadData(item.id, {'visitNoteID': widget.note.id});
      }

      widget.onProcessed(widget.note.id, 'Converted', item.id);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Linked to ${item.companyName}')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error linking note')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLinking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Process Visit Note',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'For ${widget.note.companyName ?? 'Unknown Company'}',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const Divider(height: 32),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left side: Details
                    Expanded(
                      flex: 1,
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildSectionTitle('Original Note'),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                widget.note.content,
                                style: const TextStyle(fontSize: 14),
                              ),
                            ),
                            const SizedBox(height: 20),
                            if (widget.note.imageUrls.isNotEmpty) ...[
                              _buildSectionTitle('Attached Images'),
                              SizedBox(
                                height: 120,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: widget.note.imageUrls.length,
                                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                                  itemBuilder: (context, index) {
                                    return ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        widget.note.imageUrls[index],
                                        width: 200,
                                        height: 120,
                                        fit: BoxFit.cover,
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 20),
                            ],
                            _buildSectionTitle('Captured Details'),
                            _buildDetailRow(Icons.person_outline, widget.note.capturedBy),
                            _buildDetailRow(Icons.calendar_today_outlined, DateFormat('PPpp').format(widget.note.createdAt)),
                            if (widget.note.address != null)
                               _buildDetailRow(Icons.location_on_outlined, widget.note.address!.fullAddress),
                               
                            const SizedBox(height: 20),
                            if (widget.note.discoveryData.isNotEmpty) ...[
                               _buildSectionTitle('Field Discovery Data'),
                               ...widget.note.discoveryData.entries.map((e) {
                                 if (e.value == null || (e.value is List && (e.value as List).isEmpty)) return const SizedBox.shrink();
                                 final key = e.key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}').trim();
                                 final capitalizedKey = key[0].toUpperCase() + key.substring(1);
                                 return Padding(
                                   padding: const EdgeInsets.only(bottom: 4),
                                   child: Row(
                                     crossAxisAlignment: CrossAxisAlignment.start,
                                     children: [
                                       Text('$capitalizedKey: ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                       Expanded(child: Text(e.value.toString(), style: const TextStyle(fontSize: 13, color: Colors.black54))),
                                     ],
                                   ),
                                 );
                               }).toList(),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const VerticalDivider(width: 48),
                    // Right side: Actions
                    SizedBox(
                      width: 300,
                      child: Column(
                        children: [
                          _buildActionCard(
                            title: 'Create New Lead',
                            description: 'Create a new lead in the system based on this visit note.',
                            buttonLabel: 'Create Lead',
                            onPressed: () {
                              Navigator.pop(context);
                            },
                          ),
                          const SizedBox(height: 20),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Link to Existing', style: TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 8),
                                  TextField(
                                    decoration: InputDecoration(
                                      hintText: 'Search company...',
                                      prefixIcon: const Icon(Icons.search, size: 20),
                                      isDense: true,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    onChanged: _handleSearch,
                                  ),
                                  if (_isSearching)
                                    const Padding(
                                      padding: EdgeInsets.all(8.0),
                                      child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                                    ),
                                  if (_searchResults.isNotEmpty && _selectedItem == null)
                                    Container(
                                      height: 150,
                                      margin: const EdgeInsets.only(top: 8),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey.withOpacity(0.2)),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: ListView.builder(
                                        itemCount: _searchResults.length,
                                        itemBuilder: (context, index) {
                                          final result = _searchResults[index];
                                          final item = result['item'] as Lead;
                                          final isComp = result['isCompany'] as bool;
                                          
                                          // Address for Lead is Map
                                          final addressMap = item.address;
                                          final addressDisplay = addressMap != null 
                                            ? [addressMap['street'], addressMap['city']].where((s) => s != null && s.toString().isNotEmpty).join(', ')
                                            : 'No address';

                                          return ListTile(
                                            title: Text(item.companyName, style: const TextStyle(fontSize: 13)),
                                            subtitle: Text(addressDisplay, style: const TextStyle(fontSize: 11)),
                                            trailing: isComp ? const Icon(Icons.star, color: Colors.amber, size: 16) : null,
                                            onTap: () {
                                              setState(() {
                                                _selectedItem = result;
                                              });
                                            },
                                          );
                                        },
                                      ),
                                    ),
                                  if (_selectedItem != null)
                                    Container(
                                      margin: const EdgeInsets.only(top: 8),
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.blue[50],
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              (_selectedItem!['item'] as Lead).companyName,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.close, size: 16),
                                            onPressed: () => setState(() => _selectedItem = null),
                                          ),
                                        ],
                                      ),
                                    ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: _selectedItem != null ? _handleLink : null,
                                    style: ElevatedButton.styleFrom(
                                      minimumSize: const Size(double.infinity, 40),
                                    ),
                                    child: _isLinking 
                                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Text('Link to Record'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _handleReject,
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    child: _isRejecting 
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Reject Note', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required String title,
    required String description,
    required String buttonLabel,
    required VoidCallback onPressed,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(description, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onPressed,
              style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 40)),
              child: Text(buttonLabel),
            ),
          ],
        ),
      ),
    );
  }
}
