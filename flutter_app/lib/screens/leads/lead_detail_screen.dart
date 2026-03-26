import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../models/lead.dart';
import '../../models/user_profile.dart';
import '../../models/task.dart' as model;
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import '../../services/netsuite_service.dart';
import '../../services/ai_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/leads/discovery_radar_chart.dart';
import 'package:url_launcher/url_launcher.dart';
import '../field_activity/check_in_screen.dart';
import '../../widgets/layout/main_layout.dart';

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
  final _netsuiteService = NetSuiteService();
  UserProfile? _userProfile;
  bool _isLoadingProfile = true;
  late Lead _currentLead;

  @override
  void initState() {
    super.initState();
    _currentLead = widget.lead;
    _tabController = TabController(length: 4, vsync: this);
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final user = _authService.currentUser;
    if (user != null) {
      final profile = await _authService.getUserProfile(user.uid);
      if (mounted) {
        setState(() {
          _userProfile = profile;
          _isLoadingProfile = false;
        });
      }
    } else {
      if (mounted) setState(() => _isLoadingProfile = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _makeCall() async {
    final phone = _currentLead.address?['phone'] ?? _currentLead.customerPhone ?? '';
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No phone number available')));
      return;
    }
    
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
      await _firestoreService.logActivity(_currentLead.id, {
        'type': 'Call',
        'notes': 'Initiated call to $phone',
        'date': DateTime.now().toIso8601String(),
        'author': _userProfile?.displayName ?? 'Unknown',
      });
      // Also sync to NetSuite if it's a dialer or admin
      if (_userProfile?.role == 'dialer' || _userProfile?.role == 'admin') {
         await _netsuiteService.sendActivity(
           leadId: _currentLead.id,
           type: 'Call',
           notes: 'Initiated call to $phone from mobile app',
           author: _userProfile?.displayName,
           date: DateFormat('d/M/yyyy').format(DateTime.now()),
         );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingProfile) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return MainLayout(
      title: _currentLead.companyName,
      currentRoute: '/leads/${_currentLead.id}',
      showHeader: false,
      padding: EdgeInsets.zero,
      floatingActionButton: _buildFloatingActionButton(),
      child: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          _buildSliverAppBar(),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildDetailsTab(),
            _buildTasksTab(),
            _buildAppointmentsTab(),
            _buildActivityTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 200.0,
      floating: false,
      pinned: true,
      backgroundColor: AppTheme.primary,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [AppTheme.primary, Color(0xFF0b6e92)],
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(top: 40.0, left: 20, right: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 30,
                          backgroundColor: Colors.white,
                          backgroundImage: _currentLead.avatarUrl != null ? NetworkImage(_currentLead.avatarUrl!) : null,
                          child: _currentLead.avatarUrl == null 
                              ? Text(_currentLead.companyName[0], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary))
                              : null,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _currentLead.companyName,
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  _buildStatusBadge(_currentLead.status),
                                  const SizedBox(width: 8),
                                  Text(
                                    _currentLead.industryCategory ?? 'Uncategorized',
                                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottom: TabBar(
        controller: _tabController,
        indicatorColor: AppTheme.accent,
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
          icon: const Icon(Icons.edit),
          onPressed: () {
            // Edit lead
          },
        ),
        IconButton(
          icon: const Icon(Icons.location_on),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => CheckInScreen(lead: _currentLead)),
            );
          },
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'new': color = Colors.blue; break;
      case 'qualified': color = Colors.green; break;
      case 'lost': color = Colors.red; break;
      case 'archived': color = Colors.grey; break;
      case 'field lead': color = Colors.orange; break;
      default: color = AppTheme.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildActionGrid(),
          const SizedBox(height: 16),
          _buildOverviewCard(),
          const SizedBox(height: 16),
          _buildContactCard(),
          const SizedBox(height: 16),
          if (_currentLead.discoveryData != null) ...[
             const Text('Discovery Insights', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primary)),
             const SizedBox(height: 8),
             DiscoveryRadarChart(discoveryData: _currentLead.discoveryData!),
             const SizedBox(height: 16),
          ],
          _buildSourceCard(),
          const SizedBox(height: 24),
          if (_currentLead.websiteUrl != null && _currentLead.websiteUrl!.isNotEmpty)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _runAiProspecting,
                icon: const Icon(Icons.auto_awesome),
                label: const Text('Run AI Prospecting on Website'),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
              ),
            ),
          const SizedBox(height: 80), // Space for FAB
        ],
      ),
    );
  }

  Future<void> _runAiProspecting() async {
    if (_currentLead.websiteUrl == null || _currentLead.websiteUrl!.isEmpty) return;
    
    final aiService = AiService(dotenv.get('GOOGLE_MAPS_API_KEY'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('AI is prospecting website...')));
    
    try {
      final result = await aiService.prospectWebsite(_currentLead.websiteUrl!);
      if (result != null && result['contacts'] != null && (result['contacts'] as List).isNotEmpty) {
        final contact = (result['contacts'] as List).first;
        final name = contact['name'] ?? 'Unknown';
        final title = contact['title'] ?? 'Decision Maker';
        final email = contact['email'] ?? '';
        final phone = contact['phone'] ?? '';

        await _firestoreService.updateLeadData(_currentLead.id, {
          'contacts': FieldValue.arrayUnion([{
            'name': name,
            'title': title,
            'email': email,
            'phone': phone,
            'isAiGenerated': true,
          }]),
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('AI found contact: $name ($title)')));
          setState(() {
             // Refresh UI by re-fetching or updating local state
             _currentLead.contacts?.add({
               'name': name,
               'title': title,
               'email': email,
               'phone': phone,
               'isAiGenerated': true,
             });
          });
        }
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('AI could not find specific contacts on this website.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('AI Prospecting failed: $e')));
    }
  }

  Widget _buildActionGrid() {
    final role = _userProfile?.role ?? 'field_sales';
    final List<Widget> actions = [];

    // Common actions
    actions.add(_buildActionButton(Icons.phone, 'Call', _makeCall));
    actions.add(_buildActionButton(Icons.calendar_today, 'Appt', _showScheduleApptDialog));
    actions.add(_buildActionButton(Icons.task, 'Task', _showAddTaskDialog));
    
    if (role == 'admin' || role == 'dialer') {
      actions.add(_buildActionButton(Icons.check_circle, 'Process', _showOutcomeDialog));
      actions.add(_buildActionButton(Icons.rocket_launch, 'LocalMile', () => _initiateTrial('LocalMile')));
      actions.add(_buildActionButton(Icons.inventory, 'ShipMate', () => _initiateTrial('ShipMate')));
    }

    if (role == 'admin' || role == 'field_sales') {
      actions.add(_buildActionButton(Icons.location_on, 'Check-in', () {
        Navigator.push(context, MaterialPageRoute(builder: (context) => CheckInScreen(lead: _currentLead)));
      }));
    }

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.2,
      children: actions,
    );
  }

  Widget _buildActionButton(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Card(
        color: Colors.white,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppTheme.primary, size: 28),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Business Overview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primary)),
            const Divider(),
            if (_currentLead.companyDescription != null) ...[
               Text(_currentLead.companyDescription!, style: const TextStyle(fontSize: 14, color: Colors.black87)),
               const SizedBox(height: 12),
            ],
            _buildDetailRow(Icons.business, 'Franchisee', _currentLead.franchisee ?? 'Australia Wide'),
            _buildDetailRow(Icons.person, 'Sales Rep', _currentLead.salesRepAssigned ?? 'Unassigned'),
            _buildDetailRow(Icons.person_outline, 'Dialer', _currentLead.dialerAssigned ?? 'Unassigned'),
            _buildDetailRow(Icons.language, 'Website', _currentLead.websiteUrl ?? 'N/A', isUrl: true),
          ],
        ),
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
            const Text('Contact Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primary)),
            const Divider(),
            _buildDetailRow(Icons.location_on, 'Address', _currentLead.address?['fullAddress'] ?? 'N/A'),
            _buildDetailRow(Icons.phone, 'Phone', _currentLead.address?['phone'] ?? _currentLead.customerPhone ?? 'N/A'),
            _buildDetailRow(Icons.email, 'Email', _currentLead.address?['email'] ?? _currentLead.customerServiceEmail ?? 'N/A'),
            if (_currentLead.contacts != null && _currentLead.contacts!.isNotEmpty) ...[
               const SizedBox(height: 8),
               const Text('Primary Contact:', style: TextStyle(fontSize: 12, color: Colors.grey)),
               Text(_currentLead.contacts![0]['name'] ?? 'N/A', style: const TextStyle(fontWeight: FontWeight.bold)),
               Text(_currentLead.contacts![0]['title'] ?? 'N/A', style: const TextStyle(fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSourceCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Lead Source', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primary)),
            const Divider(),
            _buildDetailRow(Icons.campaign, 'Campaign', _currentLead.campaign ?? _currentLead.customerSource ?? 'N/A'),
            _buildDetailRow(Icons.calendar_today, 'Added On', _currentLead.dateLeadEntered != null 
                ? DateFormat.yMMMd().format(DateTime.parse(_currentLead.dateLeadEntered.toString())) 
                : 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, {bool isUrl = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                InkWell(
                  onTap: isUrl && value != 'N/A' ? () => launchUrl(Uri.parse(value.startsWith('http') ? value : 'https://$value')) : null,
                  child: Text(
                    value,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                      color: isUrl && value != 'N/A' ? AppTheme.primary : Colors.black,
                      decoration: isUrl && value != 'N/A' ? TextDecoration.underline : null,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showOutcomeDialog() {
    String outcome = 'Qualified';
    String reason = '';
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Process Lead Outcome'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: outcome,
                items: ['Qualified', 'Unqualified', 'Call Back', 'Not Interested']
                    .map((o) => DropdownMenuItem(value: o, child: Text(o)))
                    .toList(),
                onChanged: (v) => setState(() => outcome = v!),
                decoration: const InputDecoration(labelText: 'Outcome'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Outcome Notes', hintText: 'Enter internal notes...'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                final res = await _netsuiteService.sendOutcome(
                  leadId: _currentLead.id,
                  outcome: outcome,
                  reason: reason,
                  dialerAssigned: _userProfile?.displayName ?? 'Unknown',
                  notes: notesController.text,
                );
                if (!mounted) return;
                if (res['success']) {
                  await _firestoreService.updateLeadData(_currentLead.id, {'status': outcome});
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lead outcome synced with NetSuite.')));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('NetSuite Sync Failed: ${res['message']}')));
                }
              },
              child: const Text('Sync to NetSuite'),
            ),
          ],
        ),
      ),
    );
  }

  void _initiateTrial(String type) async {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Initiating $type trial...')));
    final res = type == 'LocalMile' 
        ? await _netsuiteService.initiateLocalMileTrial(_currentLead.id)
        : await _netsuiteService.initiateMPProductsTrial(_currentLead.id);
    
    if (!mounted) return;
    if (res['success']) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$type Trial successfully initiated in NetSuite.')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Trial Initiation Failed: ${res['message']}')));
    }
  }

  // --- Re-implementing helper dialogs from previous version but cleaner ---

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
                contentPadding: EdgeInsets.zero,
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
                await _firestoreService.addTask(_currentLead.id, {
                  'title': titleController.text,
                  'notes': notesController.text,
                  'dueDate': dueDate.toIso8601String(),
                  'isCompleted': false,
                  'author': _userProfile?.displayName ?? 'Unknown',
                });
                if (!mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task added.')));
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
                contentPadding: EdgeInsets.zero,
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
                contentPadding: EdgeInsets.zero,
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
                final fullDate = DateTime(apptDate.year, apptDate.month, apptDate.day, apptTime.hour, apptTime.minute);
                await _firestoreService.addAppointmentToLead(_currentLead.id, {
                  'notes': notesController.text,
                  'appointmentDate': fullDate.toIso8601String(),
                  'appointmentStatus': 'Pending',
                  'assignedTo': _userProfile?.displayName ?? 'Unknown',
                  'leadId': _currentLead.id,
                });
                if (!mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appointment scheduled.')));
              },
              child: const Text('Schedule'),
            ),
          ],
        ),
      ),
    );
  }

  Widget? _buildFloatingActionButton() {
    return FloatingActionButton(
      onPressed: () => _logNote(context),
      backgroundColor: AppTheme.primary,
      child: const Icon(Icons.note_add, color: Colors.white),
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
                await _firestoreService.logActivity(_currentLead.id, {
                  'type': 'Note',
                  'notes': controller.text,
                  'date': DateTime.now().toIso8601String(),
                  'author': _userProfile?.displayName ?? 'Unknown',
                });
                // Sync to NetSuite
                await _netsuiteService.sendNote(
                  leadId: _currentLead.id,
                  noteId: DateTime.now().millisecondsSinceEpoch.toString(),
                  author: _userProfile?.displayName ?? 'Unknown',
                  content: controller.text,
                );
                if (mounted) Navigator.pop(context);
                setState(() {});
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityTab() {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: _firestoreService.getActivities(_currentLead.id),
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
              subtitle: Text('$dateStr by ${activity['author'] ?? 'Unknown'}'),
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
      case 'Trial': return Icons.rocket_launch;
      default: return Icons.info_outline;
    }
  }

  Widget _buildTasksTab() {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: _firestoreService.getActivities(_currentLead.id), // Change to tasks stream if available
      builder: (context, snapshot) {
        return FutureBuilder<List<model.Task>>(
          future: _firestoreService.getAllUserTasks(_currentLead.salesRepAssigned ?? ''),
          builder: (context, taskSnapshot) {
             // For better real-time feel, we should have a subcollection stream
             return StreamBuilder<QuerySnapshot>(
               stream: _firestoreService.db.collection('leads').doc(_currentLead.id).collection('tasks').snapshots(),
               builder: (context, streamSnap) {
                 if (!streamSnap.hasData) return const Center(child: CircularProgressIndicator());
                 final tasks = streamSnap.data!.docs;
                 if (tasks.isEmpty) return const Center(child: Text('No tasks for this lead'));

                 return ListView.separated(
                   padding: const EdgeInsets.all(16),
                   itemCount: tasks.length,
                   separatorBuilder: (context, index) => const Divider(),
                   itemBuilder: (context, index) {
                     final task = tasks[index].data() as Map<String, dynamic>;
                     final taskId = tasks[index].id;
                     final isCompleted = task['isCompleted'] ?? false;
                     return CheckboxListTile(
                       title: Text(task['title'] ?? 'Untitled Task', style: TextStyle(decoration: isCompleted ? TextDecoration.lineThrough : null)),
                       subtitle: Text('Due: ${task['duedate'] != null ? DateFormat.yMMMd().format(DateTime.parse(task['duedate'])) : 'No date'}'),
                       value: isCompleted,
                       onChanged: (val) => _firestoreService.updateTaskCompletion(_currentLead.id, taskId, val ?? false),
                       secondary: IconButton(
                         icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                         onPressed: () => _firestoreService.deleteTaskFromLead(_currentLead.id, taskId),
                       ),
                     );
                   },
                 );
               },
             );
          },
        );
      },
    );
  }

  Widget _buildAppointmentsTab() {
    return StreamBuilder<QuerySnapshot>(
      stream: _firestoreService.db.collection('leads').doc(_currentLead.id).collection('appointments').snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final appts = snapshot.data!.docs;
        if (appts.isEmpty) return const Center(child: Text('No appointments scheduled'));

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: appts.length,
          separatorBuilder: (context, index) => const Divider(),
          itemBuilder: (context, index) {
            final appt = appts[index].data() as Map<String, dynamic>;
            final date = DateTime.tryParse(appt['appointmentDate'] ?? '');
            return ListTile(
              leading: const Icon(Icons.calendar_today, color: AppTheme.primary),
              title: Text(appt['notes'] ?? 'No notes'),
              subtitle: Text(date != null ? DateFormat.yMMMd().add_jm().format(date) : appt['appointmentDate'] ?? 'Unknown date'),
              trailing: _buildStatusBadge(appt['appointmentStatus'] ?? 'Pending'),
            );
          },
        );
      },
    );
  }
}
