import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/visit_note.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/leads/visit_note_processor_dialog.dart';
import 'capture_visit_screen.dart';
import '../../widgets/layout/main_layout.dart';

class VisitNotesListScreen extends StatefulWidget {
  const VisitNotesListScreen({super.key});

  @override
  State<VisitNotesListScreen> createState() => _VisitNotesListScreenState();
}

class _VisitNotesListScreenState extends State<VisitNotesListScreen> {
  final _firestoreService = FirestoreService();
  final _authService = AuthService();
  List<VisitNote> _allVisitNotes = [];
  List<VisitNote> _filteredNotes = [];
  bool _isLoading = true;

  // Filter state
  String _companyFilter = '';
  List<String> _selectedOutcomes = [];
  List<String> _selectedStatuses = [];

  // Sorting state
  int? _sortColumnIndex;
  bool _sortAscending = true;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    try {
      final user = _authService.currentUser;
      if (user != null) {
        final profile = await _authService.getUserProfile(user.uid);
        
        List<VisitNote> notes;
        final role = profile?.role;
        
        if (['admin', 'Lead Gen Admin', 'Field Sales Admin'].contains(role)) {
          // Admins see everything
          notes = await _firestoreService.getVisitNotes();
        } else if (role == 'Franchisee') {
          // Franchisees see their own notes and notes from their franchise
          notes = await _firestoreService.getVisitNotes(franchiseeId: profile?.franchisee);
        } else {
          // Standard reps only see what they captured
          notes = await _firestoreService.getVisitNotes(uid: user.uid);
        }

        setState(() {
          _allVisitNotes = notes;
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading notes: $e')));
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredNotes = _allVisitNotes.where((note) {
        final matchesCompany = note.companyName?.toLowerCase().contains(_companyFilter.toLowerCase()) ?? true;
        final matchesOutcome = _selectedOutcomes.isEmpty || _selectedOutcomes.contains(note.outcome['type']);
        final matchesStatus = _selectedStatuses.isEmpty || _selectedStatuses.contains(note.status);
        return matchesCompany && matchesOutcome && matchesStatus;
      }).toList();
      _applySort();
    });
  }

  void _applySort() {
    if (_sortColumnIndex == null) return;

    _filteredNotes.sort((a, b) {
      dynamic aValue;
      dynamic bValue;

      switch (_sortColumnIndex) {
        case 0: // Captured By
          aValue = a.capturedBy;
          bValue = b.capturedBy;
          break;
        case 1: // Date
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 2: // Company Name
          aValue = a.companyName ?? '';
          bValue = b.companyName ?? '';
          break;
        case 4: // Outcome
          aValue = a.outcome['type'] ?? '';
          bValue = b.outcome['type'] ?? '';
          break;
        case 5: // Status
          aValue = a.status ?? '';
          bValue = b.status ?? '';
          break;
        default:
          return 0;
      }

      int result = aValue.compareTo(bValue);
      return _sortAscending ? result : -result;
    });
  }

  void _onSort(int columnIndex, bool ascending) {
    setState(() {
      _sortColumnIndex = columnIndex;
      _sortAscending = ascending;
      _applySort();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      title: 'Visit Notes',
      currentRoute: '/visit-notes',
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _buildFilterBar(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredNotes.isEmpty
                    ? _buildEmptyState()
                    : _buildTable(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            offset: const Offset(0, 2),
            blurRadius: 4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.filter_list, size: 20, color: Color(0xFF095c7b)),
              const SizedBox(width: 8),
              const Text('Filters', style: TextStyle(fontWeight: FontWeight.bold)),
              const Spacer(),
              if (_companyFilter.isNotEmpty || _selectedOutcomes.isNotEmpty || _selectedStatuses.isNotEmpty)
                TextButton(
                  onPressed: () {
                    setState(() {
                      _companyFilter = '';
                      _selectedOutcomes = [];
                      _selectedStatuses = [];
                      _applyFilters();
                    });
                  },
                  child: const Text('Clear All'),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: InputDecoration(
              hintText: 'Search by company...',
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onChanged: (value) {
              _companyFilter = value;
              _applyFilters();
            },
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildMultiSelectFilter(
                  label: 'Outcome',
                  options: _allVisitNotes.map((n) => n.outcome['type'] as String?).whereType<String>().toSet().toList(),
                  selected: _selectedOutcomes,
                  onChanged: (newSelection) {
                    setState(() => _selectedOutcomes = newSelection);
                    _applyFilters();
                  },
                ),
                const SizedBox(width: 8),
                _buildMultiSelectFilter(
                  label: 'Status',
                  options: _allVisitNotes.map((n) => n.status).whereType<String>().toSet().toList(),
                  selected: _selectedStatuses,
                  onChanged: (newSelection) {
                    setState(() => _selectedStatuses = newSelection);
                    _applyFilters();
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMultiSelectFilter({
    required String label,
    required List<String> options,
    required List<String> selected,
    required Function(List<String>) onChanged,
  }) {
    return OutlinedButton.icon(
      onPressed: () async {
        final List<String>? result = await showDialog<List<String>>(
          context: context,
          builder: (context) {
            List<String> tempSelected = List.from(selected);
            return StatefulBuilder(
              builder: (context, setDialogState) {
                return AlertDialog(
                  title: Text('Select $label'),
                  content: SingleChildScrollView(
                    child: ListBody(
                      children: options.map((opt) {
                        return CheckboxListTile(
                          title: Text(opt, style: const TextStyle(fontSize: 14)),
                          value: tempSelected.contains(opt),
                          onChanged: (val) {
                            setDialogState(() {
                              if (val == true) {
                                tempSelected.add(opt);
                              } else {
                                tempSelected.remove(opt);
                              }
                            });
                          },
                          controlAffinity: ListTileControlAffinity.leading,
                          dense: true,
                        );
                      }).toList(),
                    ),
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                    TextButton(onPressed: () => Navigator.pop(context, tempSelected), child: const Text('Apply')),
                  ],
                );
              },
            );
          },
        );
        if (result != null) onChanged(result);
      },
      icon: const Icon(Icons.keyboard_arrow_down, size: 18),
      label: Text(
        selected.isEmpty ? label : '$label (${selected.length})',
        style: const TextStyle(fontSize: 12),
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: selected.isEmpty ? Colors.grey[700] : const Color(0xFF095c7b),
        side: BorderSide(color: selected.isEmpty ? Colors.grey[300]! : const Color(0xFF095c7b)),
        padding: const EdgeInsets.symmetric(horizontal: 12),
      ),
    );
  }

  Widget _buildTable() {
    return SingleChildScrollView(
      scrollDirection: Axis.vertical,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          sortColumnIndex: _sortColumnIndex,
          sortAscending: _sortAscending,
          columns: [
            DataColumn(label: const Text('Captured By'), onSort: _onSort),
            DataColumn(label: const Text('Date'), onSort: _onSort),
            DataColumn(label: const Text('Company Name'), onSort: _onSort),
            const DataColumn(label: Text('Address')),
            DataColumn(label: const Text('Outcome'), onSort: _onSort),
            DataColumn(label: const Text('Status'), onSort: _onSort),
            const DataColumn(label: Text('Scheduled Appt')),
            const DataColumn(label: Text('Action'), numeric: true),
          ],
          rows: _filteredNotes.map((note) => _buildDataRow(note)).toList(),
        ),
      ),
    );
  }

  DataRow _buildDataRow(VisitNote note) {
    return DataRow(
      cells: [
        DataCell(Text(note.capturedBy)),
        DataCell(Text(DateFormat.yMMMd().format(note.createdAt))),
        DataCell(Text(note.companyName ?? 'N/A')),
        DataCell(Text(note.address?.city ?? 'N/A')),
        DataCell(Text(note.outcome['type'] ?? 'N/A')),
        DataCell(_buildStatusBadge(note.status)),
        DataCell(_buildScheduledCell(note)),
        DataCell(_buildActionButtons(note)),
      ],
    );
  }

  Widget _buildStatusBadge(String? status) {
    Color bgColor = Colors.blue[50]!;
    Color textColor = Colors.blue[800]!;

    if (status == 'Converted') {
      bgColor = Colors.green[50]!;
      textColor = Colors.green[800]!;
    } else if (status == 'Rejected') {
      bgColor = Colors.red[50]!;
      textColor = Colors.red[800]!;
    } else if (status == 'In Progress') {
      bgColor = Colors.orange[50]!;
      textColor = Colors.orange[800]!;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status ?? 'New',
        style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildScheduledCell(VisitNote note) {
    if (note.outcome['type'] == 'Qualified - Set Appointment' && note.scheduledDate != null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_today, size: 10, color: Colors.grey),
              const SizedBox(width: 4),
              Text(note.scheduledDate!, style: const TextStyle(fontSize: 10)),
            ],
          ),
          if (note.scheduledTime != null)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.access_time, size: 10, color: Colors.grey),
                const SizedBox(width: 4),
                Text(note.scheduledTime!, style: const TextStyle(fontSize: 10)),
              ],
            ),
        ],
      );
    }
    return const Text('-', style: TextStyle(color: Colors.grey));
  }

  Widget _buildActionButtons(VisitNote note) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ElevatedButton(
          onPressed: () => _handleProcess(note),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            minimumSize: const Size(60, 30),
            backgroundColor: const Color(0xFF095c7b),
            foregroundColor: Colors.white,
          ),
          child: Text(note.status == 'New' ? 'Process' : 'View', style: const TextStyle(fontSize: 10)),
        ),
        IconButton(
          icon: const Icon(Icons.edit, size: 18),
          onPressed: () => _handleEdit(note),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
        IconButton(
          icon: const Icon(Icons.image, size: 18),
          onPressed: note.imageUrls.isEmpty ? null : () => _showImages(note),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          color: note.imageUrls.isEmpty ? Colors.grey : Colors.blue,
        ),
        IconButton(
          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
          onPressed: () => _handleDelete(note),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
      ],
    );
  }

  void _handleProcess(VisitNote note) {
    showDialog(
      context: context,
      builder: (context) => VisitNoteProcessorDialog(
        note: note,
        onProcessed: (noteId, status, leadId) {
          _loadNotes();
        },
      ),
    );
  }

  void _handleEdit(VisitNote note) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CaptureVisitScreen(note: note),
      ),
    ).then((_) => _loadNotes());
  }

  void _showImages(VisitNote note) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Visit Photos'),
        content: SizedBox(
          width: double.maxFinite,
          height: 300,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: note.imageUrls.length,
            itemBuilder: (context, index) => Padding(
              padding: const EdgeInsets.all(8.0),
              child: Image.network(note.imageUrls[index], fit: BoxFit.contain),
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Future<void> _handleDelete(VisitNote note) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: const Text('Are you sure you want to delete this visit note?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _firestoreService.deleteVisitNote(note.id);
        _loadNotes();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error deleting note: $e')));
        }
      }
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.note_alt_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text('No visit notes found matching your filters.', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
