import 'package:flutter/material.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import 'lead_detail_screen.dart';

class LeadListScreen extends StatefulWidget {
  final String? initialStatusFilter;
  final String? initialSourceFilter;

  const LeadListScreen({
    super.key,
    this.initialStatusFilter,
    this.initialSourceFilter,
  });

  @override
  State<LeadListScreen> createState() => _LeadListScreenState();
}

class _LeadListScreenState extends State<LeadListScreen> {
  final _firestoreService = FirestoreService();
  String _searchQuery = '';
  late String _statusFilter;
  late String? _sourceFilter;

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.initialStatusFilter ?? 'All';
    _sourceFilter = widget.initialSourceFilter;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              decoration: InputDecoration(
                hintText: 'Search companies...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
          ),
        ),
      ),
      body: StreamBuilder<List<Lead>>(
        stream: _firestoreService.getLeads(),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final leads = snapshot.data!.where((lead) {
            final nameMatch = lead.companyName.toLowerCase().contains(_searchQuery.toLowerCase());
            final statusMatch = _statusFilter == 'All' || lead.status == _statusFilter;
            final sourceMatch = _sourceFilter == null || lead.customerSource == _sourceFilter;
            return nameMatch && statusMatch && sourceMatch;
          }).toList();

          if (leads.isEmpty) {
            return const Center(child: Text('No leads found'));
          }

          return ListView.builder(
            itemCount: leads.length,
            itemBuilder: (context, index) {
              final lead = leads[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF095c7b).withOpacity(0.1),
                    child: const Icon(Icons.business, color: Color(0xFF095c7b)),
                  ),
                  title: Text(lead.companyName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(lead.industryCategory ?? 'No Category'),
                  trailing: _buildStatusBadge(lead.status),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => LeadDetailScreen(lead: lead),
                      ),
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _getStatusColor(status)),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: _getStatusColor(status),
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Won': return Colors.green;
      case 'Lost': return Colors.red;
      case 'New': return Colors.blue;
      case 'Qualified': return Colors.orange;
      case 'Priority Lead': return Colors.purple;
      default: return Colors.grey;
    }
  }

  void _showFilterDialog() {
    final statuses = ['All', 'New', 'Priority Lead', 'Contacted', 'Qualified', 'Won', 'Lost'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter by Status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: statuses.map((s) => 
            RadioListTile<String>(
              title: Text(s),
              value: s,
              groupValue: _statusFilter,
              onChanged: (value) {
                setState(() => _statusFilter = value!);
                Navigator.pop(context);
              },
            )
          ).toList(),
        ),
      ),
    );
  }
}
