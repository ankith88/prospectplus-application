import 'package:flutter/material.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import 'package:url_launcher/url_launcher.dart';

class LeadDetailScreen extends StatefulWidget {
  final Lead lead;
  const LeadDetailScreen({super.key, required this.lead});

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen> {
  void _makeCall() async {
    final phone = widget.lead.address?['phone'] ?? ''; // Adjust based on model
    if (phone.isEmpty) return;
    
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
      await FirestoreService().logActivity(widget.lead.id, {
        'type': 'Call',
        'notes': 'Initiated call to $phone',
      });
    }
  }

  void _logNote(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log a Note'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Enter your note here...'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.isNotEmpty) {
                final note = controller.text;
                await FirestoreService().logActivity(widget.lead.id, {
                  'type': 'Note',
                  'notes': note,
                });
                if (!mounted) return;
                Navigator.pop(context);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _runAiScoring() async {
    // Placeholder for AI scoring logic
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('AI Scoring coming soon (needs API key)')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.lead.companyName),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            const SizedBox(height: 24),
            _buildActionButtons(context),
            const SizedBox(height: 24),
            _buildDetailsCard(context),
            const SizedBox(height: 24),
            const Text('Activity History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildActivityList(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: const Color(0xFF095c7b).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.business, color: Color(0xFF095c7b), size: 32),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.lead.companyName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Chip(
                label: Text(widget.lead.status, style: const TextStyle(fontSize: 12)),
                backgroundColor: const Color(0xFFeaf143).withOpacity(0.2),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _makeCall,
            icon: const Icon(Icons.phone),
            label: const Text('Call'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF095c7b),
              foregroundColor: Colors.white,
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _logNote(context),
            icon: const Icon(Icons.note_add),
            label: const Text('Note'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _runAiScoring,
            icon: const Icon(Icons.auto_awesome),
            label: const Text('AI Score'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFeaf143),
              foregroundColor: const Color(0xFF095c7b),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Company Details', style: TextStyle(fontWeight: FontWeight.bold)),
            const Divider(),
            _buildDetailRow(Icons.category, 'Industry', widget.lead.industryCategory ?? 'N/A'),
            _buildDetailRow(Icons.person, 'Sales Rep', widget.lead.salesRepAssigned ?? 'Unassigned'),
            _buildDetailRow(Icons.language, 'Website', widget.lead.websiteUrl ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Text('$label:', style: const TextStyle(color: Colors.grey)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _buildActivityList() {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: FirestoreService().getActivities(widget.lead.id),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final activities = snapshot.data!;
        if (activities.isEmpty) return const Text('No recent activity');

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: activities.length,
          separatorBuilder: (context, index) => const Divider(),
          itemBuilder: (context, index) {
            final activity = activities[index];
            return ListTile(
              leading: Icon(_getActivityIcon(activity['type'])),
              title: Text(activity['notes'] ?? ''),
              subtitle: Text(activity['date']?.split('T')[0] ?? ''),
            );
          },
        );
      },
    );
  }

  IconData _getActivityIcon(String? type) {
    switch (type) {
      case 'Call': return Icons.phone;
      case 'Note': return Icons.note;
      default: return Icons.info_outline;
    }
  }
}
