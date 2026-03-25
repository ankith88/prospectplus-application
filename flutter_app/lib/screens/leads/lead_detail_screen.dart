import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import 'package:url_launcher/url_launcher.dart';
import '../field_activity/check_in_screen.dart';

class LeadDetailScreen extends StatefulWidget {
  final Lead lead;
  const LeadDetailScreen({super.key, required this.lead});

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _firestoreService = FirestoreService();
  final _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _makeCall() async {
    final phone = widget.lead.address?['phone'] ?? '';
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No phone number available')));
      return;
    }
    
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
      await _firestoreService.logActivity(widget.lead.id, {
        'type': 'Call',
        'notes': 'Initiated call to $phone',
        'date': DateTime.now().toIso8601String(),
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.lead.companyName),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFeaf143),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Details'),
            Tab(text: 'Tasks'),
            Tab(text: 'Appts'),
            Tab(text: 'Activity'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.location_on),
            tooltip: 'Check-in',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => CheckInScreen(lead: widget.lead)),
              );
            },
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDetailsTab(),
          _buildTasksTab(),
          _buildAppointmentsTab(),
          _buildActivityTab(),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget? _buildFloatingActionButton() {
    return FloatingActionButton(
      onPressed: () {
        // Show menu for adding task, appt, or note
        _showAddMenu();
      },
      backgroundColor: const Color(0xFF095c7b),
      child: const Icon(Icons.add, color: Colors.white),
    );
  }

  void _showAddMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.task_alt),
            title: const Text('Add Task'),
            onTap: () {
              Navigator.pop(context);
              _showAddTaskDialog();
            },
          ),
          ListTile(
            leading: const Icon(Icons.calendar_month),
            title: const Text('Schedule Appointment'),
            onTap: () {
              Navigator.pop(context);
              _showScheduleApptDialog();
            },
          ),
          ListTile(
            leading: const Icon(Icons.location_on),
            title: const Text('Check-in'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => CheckInScreen(lead: widget.lead)),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.note_add),
            title: const Text('Add Note'),
            onTap: () {
              Navigator.pop(context);
              _logNote(context);
            },
          ),
        ],
      ),
    );
  }

  void _showAddTaskDialog() {
    final titleController = TextEditingController();
    final notesController = TextEditingController();
    DateTime dueDate = DateTime.now();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add Task'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Task Title')),
              TextField(controller: notesController, decoration: const InputDecoration(labelText: 'Notes')),
              const SizedBox(height: 16),
              ListTile(
                title: Text('Due: ${DateFormat.yMMMd().format(dueDate)}'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: dueDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => dueDate = picked);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final user = _authService.currentUser;
                final profile = user != null ? await _authService.getUserProfile(user.uid) : null;
                
                await _firestoreService.addTaskToLead(widget.lead.id, {
                  'title': titleController.text,
                  'notes': notesController.text,
                  'duedate': dueDate.toIso8601String(),
                  'isCompleted': false,
                  'dialerAssigned': profile?.displayName ?? 'Unknown',
                });
                if (mounted) Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _showScheduleApptDialog() {
    final notesController = TextEditingController();
    DateTime apptDate = DateTime.now();
    TimeOfDay apptTime = TimeOfDay.now();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Schedule Appointment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: notesController, decoration: const InputDecoration(labelText: 'Notes')),
              const SizedBox(height: 16),
              ListTile(
                title: Text('Date: ${DateFormat.yMMMd().format(apptDate)}'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: apptDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => apptDate = picked);
                },
              ),
              ListTile(
                title: Text('Time: ${apptTime.format(context)}'),
                trailing: const Icon(Icons.access_time),
                onTap: () async {
                  final picked = await showTimePicker(context: context, initialTime: apptTime);
                  if (picked != null) setState(() => apptTime = picked);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final user = _authService.currentUser;
                final profile = user != null ? await _authService.getUserProfile(user.uid) : null;
                
                final fullDate = DateTime(apptDate.year, apptDate.month, apptDate.day, apptTime.hour, apptTime.minute);
                
                await _firestoreService.addAppointmentToLead(widget.lead.id, {
                  'notes': notesController.text,
                  'duedate': apptDate.toIso8601String(),
                  'starttime': '${apptTime.hour}:${apptTime.minute.toString().padLeft(2, '0')}',
                  'appointmentDate': fullDate.toIso8601String(),
                  'appointmentStatus': 'Pending',
                  'assignedTo': profile?.displayName ?? 'Unknown',
                  'leadId': widget.lead.id,
                });
                if (mounted) Navigator.pop(context);
              },
              child: const Text('Schedule'),
            ),
          ],
        ),
      ),
    );
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
                await _firestoreService.logActivity(widget.lead.id, {
                  'type': 'Note',
                  'notes': controller.text,
                  'date': DateTime.now().toIso8601String(),
                });
                if (mounted) Navigator.pop(context);
                setState(() {}); // Refresh activity
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildContactCard(),
          const SizedBox(height: 16),
          _buildInfoCard(),
          const SizedBox(height: 16),
          if (widget.lead.discoveryData != null) _buildDiscoveryCard(),
        ],
      ),
    );
  }

  Widget _buildContactCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Contact Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(icon: const Icon(Icons.phone, color: Color(0xFF095c7b)), onPressed: _makeCall),
              ],
            ),
            const Divider(),
            _buildDetailRow(Icons.location_on, 'Address', widget.lead.address?['fullAddress'] ?? 'N/A'),
            _buildDetailRow(Icons.phone, 'Phone', widget.lead.address?['phone'] ?? 'N/A'),
            _buildDetailRow(Icons.email, 'Email', widget.lead.address?['email'] ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Lead Info', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(),
            _buildDetailRow(Icons.category, 'Industry', widget.lead.industryCategory ?? 'N/A'),
            _buildDetailRow(Icons.person, 'Sales Rep', widget.lead.salesRepAssigned ?? 'Unassigned'),
            _buildDetailRow(Icons.person_outline, 'Dialer', widget.lead.dialerAssigned ?? 'Unassigned'),
            _buildDetailRow(Icons.timer, 'Status', widget.lead.status),
          ],
        ),
      ),
    );
  }

  Widget _buildDiscoveryCard() {
    final data = widget.lead.discoveryData!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Discovery Results', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(),
            _buildDetailRow(Icons.star, 'Opportunity Score', '${data['score'] ?? 0}%'),
            _buildDetailRow(Icons.route, 'Routing Tag', data['routingTag'] ?? 'N/A'),
            if (data['scoringReason'] != null)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(
                  'Reason: ${data['scoringReason']}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTasksTab() {
    // This would typically be a local stream of tasks for this specific lead
    return const Center(child: Text('Leads-specific Tasks view coming soon'));
  }

  Widget _buildAppointmentsTab() {
    return const Center(child: Text('Leads-specific Appointments view coming soon'));
  }

  Widget _buildActivityTab() {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: _firestoreService.getActivities(widget.lead.id),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final activities = snapshot.data!;
        if (activities.isEmpty) return const Center(child: Text('No recent activity'));

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: activities.length,
          separatorBuilder: (context, index) => const Divider(),
          itemBuilder: (context, index) {
            final activity = activities[index];
            final date = DateTime.tryParse(activity['date'] ?? '');
            final dateStr = date != null ? DateFormat.yMMMd().add_jm().format(date) : activity['date'] ?? '';

            return ListTile(
              leading: Icon(_getActivityIcon(activity['type'])),
              title: Text(activity['notes'] ?? ''),
              subtitle: Text(dateStr),
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
      case 'Update': return Icons.system_update_alt;
      default: return Icons.info_outline;
    }
  }
}
