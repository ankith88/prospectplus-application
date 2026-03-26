import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/lead.dart';
import '../../models/user_profile.dart';
import '../../models/task.dart' as model;
import '../../models/appointment.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import '../../services/netsuite_service.dart';
import '../../services/ai_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/leads/discovery_radar_chart.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../widgets/layout/main_layout.dart';

class CompanyDetailScreen extends StatefulWidget {
  final Lead company;
  const CompanyDetailScreen({super.key, required this.company});

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _firestoreService = FirestoreService();
  final _authService = AuthService();
  final _netsuiteService = NetSuiteService();
  
  UserProfile? _userProfile;
  bool _isLoadingProfile = true;
  late Lead _currentCompany;

  @override
  void initState() {
    super.initState();
    _currentCompany = widget.company;
    _tabController = TabController(length: 5, vsync: this);
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

  @override
  Widget build(BuildContext context) {
    if (_isLoadingProfile) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return MainLayout(
      title: _currentCompany.companyName,
      currentRoute: '/companies/${_currentCompany.id}',
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
            _buildInvoicesTab(),
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
                          backgroundImage: _currentCompany.avatarUrl != null ? NetworkImage(_currentCompany.avatarUrl!) : null,
                          child: _currentCompany.avatarUrl == null 
                              ? Text(_currentCompany.companyName[0], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary))
                              : null,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _currentCompany.companyName,
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  _buildStatusBadge(_currentCompany.status),
                                  const SizedBox(width: 8),
                                  Text(
                                    'CID: ${_currentCompany.entityId ?? "N/A"}',
                                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        if (_currentCompany.websiteUrl != null)
                          OutlinedButton.icon(
                            onPressed: _isProspecting ? null : _handleAiProspect,
                            icon: _isProspecting 
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.auto_awesome, size: 14, color: Colors.white),
                            label: Text(_isProspecting ? 'Prospecting...' : 'AI Prospect', style: const TextStyle(color: Colors.white, fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.white54),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
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
        isScrollable: true,
        tabs: const [
          Tab(text: 'Details'),
          Tab(text: 'Tasks'),
          Tab(text: 'Appointments'),
          Tab(text: 'Invoices'),
          Tab(text: 'Activity'),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green),
      ),
      child: Text(
        status,
        style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildTasksTab() {
    return Column(
      children: [
        _buildAddTaskBar(),
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: _firestoreService.db
                .collection('companies')
                .doc(_currentCompany.id)
                .collection('tasks')
                .orderBy('dueDate', descending: false)
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return const Center(child: Text('No active tasks'));
              }
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: snapshot.data!.docs.length,
                itemBuilder: (context, index) {
                  final doc = snapshot.data!.docs[index];
                  final task = model.Task.fromFirestore(doc);
                  return _buildTaskTile(task);
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAddTaskBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Colors.grey[100],
      child: Row(
        children: [
          const Icon(Icons.add_task, color: AppTheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Manage and add tasks for this company',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
          ),
          TextButton(
            onPressed: _showAddTaskDialog,
            child: const Text('Add Task'),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskTile(model.Task task) {
    final isOverdue = task.isOverdue;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Checkbox(
          value: task.isCompleted,
          activeColor: AppTheme.primary,
          onChanged: (val) => _firestoreService.updateTaskCompletion(_currentCompany.id, task.id, val ?? false, isCompany: true),
        ),
        title: Text(
          task.title,
          style: TextStyle(
            decoration: task.isCompleted ? TextDecoration.lineThrough : null,
            color: task.isCompleted ? Colors.grey : Colors.black87,
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Row(
          children: [
            Icon(Icons.calendar_today, size: 12, color: isOverdue ? Colors.red : Colors.grey),
            const SizedBox(width: 4),
            Text(
              task.dueDate.isNotEmpty ? DateFormat('MMM d, yyyy').format(DateTime.parse(task.dueDate)) : 'No date',
              style: TextStyle(fontSize: 12, color: isOverdue ? Colors.red : Colors.grey),
            ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, size: 20, color: Colors.grey),
          onPressed: () => _deleteTask(task.id),
        ),
      ),
    );
  }

  Widget _buildAppointmentsTab() {
    return StreamBuilder<QuerySnapshot>(
      stream: _firestoreService.db
          .collection('companies')
          .doc(_currentCompany.id)
          .collection('appointments')
          .orderBy('duedate', descending: false)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return const Center(child: Text('No scheduled appointments'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            final doc = snapshot.data!.docs[index];
            final appt = Appointment.fromFirestore(doc);
            return _buildAppointmentCard(appt);
          },
        );
      },
    );
  }

  Widget _buildAppointmentCard(Appointment appt) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.event, color: AppTheme.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  appt.assignedTo,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    appt.type,
                    style: const TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: Colors.grey),
                const SizedBox(width: 6),
                Text(
                  appt.duedate.isNotEmpty 
                      ? '${DateFormat('MMM d, yyyy').format(DateTime.parse(appt.duedate))} at ${appt.starttime}'
                      : 'Time unassigned',
                  style: const TextStyle(color: Colors.black87, fontSize: 14),
                ),
              ],
            ),
            if (appt.notes != null && appt.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                appt.notes!,
                style: TextStyle(color: Colors.grey[600], fontSize: 13, fontStyle: FontStyle.italic),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsTab() {
    final hasCancellation = _currentCompany.status == 'Lost Customer' || 
                           _currentCompany.cancellationTheme != null || 
                           _currentCompany.cancellationCategory != null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasCancellation) _buildCancellationAlert(),
          const SizedBox(height: 16),
          _buildCompanyInfoCard(),
          const SizedBox(height: 16),
          _buildContactCard(),
          const SizedBox(height: 16),
          if (_currentCompany.discoveryData != null) ...[
             const Text('Discovery Insights', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primary)),
             const SizedBox(height: 8),
             DiscoveryRadarChart(discoveryData: _currentCompany.discoveryData!),
             const SizedBox(height: 16),
          ],
          _buildAddressCard(),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildCancellationAlert() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning, color: Colors.red[700]),
              const SizedBox(width: 8),
              Text('Cancellation Details', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red[900])),
            ],
          ),
          const SizedBox(height: 12),
          _buildCancellationRow('Date', _currentCompany.cancellationdate ?? 'N/A'),
          _buildCancellationRow('Theme', _currentCompany.cancellationTheme ?? 'N/A'),
          _buildCancellationRow('Category', _currentCompany.cancellationCategory ?? 'N/A'),
          _buildCancellationRow('Reason', _currentCompany.cancellationReason ?? 'N/A'),
        ],
      ),
    );
  }

  Widget _buildCancellationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        children: [
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  Widget _buildCompanyInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Company Information', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary)),
            const Divider(),
            _buildDetailRow(Icons.fingerprint, 'Customer ID', _currentCompany.entityId ?? 'N/A'),
            _buildDetailRow(Icons.numbers, 'NetSuite ID', _currentCompany.internalid ?? 'N/A'),
            _buildDetailRow(Icons.business, 'Franchisee', _currentCompany.franchisee ?? 'N/A'),
            _buildDetailRow(Icons.category, 'Industry', _currentCompany.industryCategory ?? 'N/A'),
            _buildDetailRow(Icons.email, 'Email', _currentCompany.customerServiceEmail ?? 'N/A'),
            _buildDetailRow(Icons.phone, 'Phone', _currentCompany.customerPhone ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Contacts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary)),
            const Divider(),
            if (_currentCompany.contacts == null || _currentCompany.contacts!.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(8.0), child: Text('No contacts found')))
            else
              ..._currentCompany.contacts!.map((c) => 
                _buildContactItem(c['name'] ?? 'N/A', c['title'] ?? 'N/A', c['email'] ?? 'N/A', c['phone'] ?? 'N/A')
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactItem(String name, String title, String email, String phone) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.email, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text(email, style: const TextStyle(fontSize: 12)),
              const Spacer(),
              const Icon(Icons.phone, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text(phone, style: const TextStyle(fontSize: 12)),
            ],
          ),
          const Divider(),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text('$label:', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(color: Colors.black87, fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildAddressCard() {
    final street = _currentCompany.address?['street'] ?? 'N/A';
    final city = _currentCompany.address?['city'] ?? '';
    final state = _currentCompany.address?['state'] ?? '';
    final zip = _currentCompany.address?['zip'] ?? '';
    final addressStr = '$street, $city $state $zip'.trim();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary)),
            const Divider(),
            Row(
              children: [
                const Icon(Icons.location_on, size: 20, color: Colors.grey),
                const SizedBox(width: 12),
                Expanded(child: Text(addressStr)),
              ],
            ),
            const SizedBox(height: 16),
            if (_currentCompany.latitude != null && _currentCompany.longitude != null)
              SizedBox(
                height: 200,
                width: double.infinity,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(_currentCompany.latitude!, _currentCompany.longitude!),
                      zoom: 15,
                    ),
                    markers: {
                      Marker(
                        markerId: MarkerId(_currentCompany.id),
                        position: LatLng(_currentCompany.latitude!, _currentCompany.longitude!),
                      ),
                    },
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget? _buildFloatingActionButton() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        FloatingActionButton.small(
          onPressed: _logNote,
          backgroundColor: AppTheme.primary,
          child: const Icon(Icons.note_add, color: Colors.white),
        ),
        const SizedBox(height: 12),
        FloatingActionButton.extended(
          onPressed: _showUpsellDialog,
          backgroundColor: AppTheme.primary,
          icon: const Icon(Icons.trending_up, color: Colors.white),
          label: const Text('Record Upsell', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  void _logNote() {
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
                 await _firestoreService.logCompanyActivity(_currentCompany.id, {
                  'type': 'Note',
                  'notes': controller.text,
                  'date': DateTime.now().toIso8601String(),
                  'author': _userProfile?.displayName ?? 'Unknown',
                });
                // Sync to NetSuite
                await _netsuiteService.sendNote(
                  leadId: _currentCompany.id,
                  noteId: DateTime.now().millisecondsSinceEpoch.toString(),
                  author: _userProfile?.displayName ?? 'Unknown',
                  content: controller.text,
                );
                if (mounted) Navigator.pop(context);
                _loadActivities();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _showUpsellDialog() async {
    final notesController = TextEditingController();
    UserProfile? selectedRep = _userProfile;
    
    List<UserProfile> fieldReps = [];
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Record Upsell'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_userProfile?.role == 'admin') ...[
                DropdownButtonFormField<UserProfile>(
                  value: selectedRep,
                  items: fieldReps.map((r) => DropdownMenuItem(value: r, child: Text(r.displayName ?? r.email))).toList(),
                  onChanged: (v) => setState(() => selectedRep = v),
                  decoration: const InputDecoration(labelText: 'Assigned Rep'),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: notesController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Upsell Notes', hintText: 'What was upsold?'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                final upsellData = {
                  'companyId': _currentCompany.id,
                  'companyName': _currentCompany.companyName,
                  'repUid': selectedRep?.id ?? _authService.currentUser?.uid,
                  'repName': selectedRep?.displayName ?? 'Unknown',
                  'notes': notesController.text,
                  'date': DateTime.now().toIso8601String(),
                };
                
                await _firestoreService.logUpsell(upsellData);
                
                final res = await _netsuiteService.sendUpsellNotification(
                  companyId: _currentCompany.id,
                  repName: selectedRep?.displayName ?? 'Mobile App User',
                  notes: notesController.text,
                );
                
                if (!mounted) return;
                if (res['success']) {
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upsell recorded and synced with NetSuite!')));
                } else {
                   ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Netsuite Sync Failed: ${res['message']}')));
                }
                _loadActivities();
              },
              child: const Text('Confirm'),
            ),
          ],
        ),
      ),
    );
  }

  bool _isProspecting = false;
  Future<void> _handleAiProspect() async {
    if (_currentCompany.websiteUrl == null) return;
    
    setState(() => _isProspecting = true);
    try {
      final aiService = AiService(dotenv.env['GEMINI_API_KEY'] ?? '');
      final result = await aiService.prospectWebsite(
        _currentCompany.websiteUrl!,
      );
      
      if (mounted && result != null) {
        setState(() {
          _currentCompany = _currentCompany.copyWith(
            avatarUrl: result['logoUrl'],
            contacts: (result['contacts'] as List?)?.map((c) => Map<String, dynamic>.from(c)).toList(),
          );
          _isProspecting = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI Prospecting complete! Profile updated.')),
        );
      } else {
        setState(() => _isProspecting = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProspecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Prospecting failed: $e')),
        );
      }
    }
  }

  void _showAddTaskDialog() {
    final titleController = TextEditingController();
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add Task'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Task Title'),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Due Date'),
                subtitle: Text(DateFormat('MMM d, yyyy').format(selectedDate)),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => selectedDate = picked);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (titleController.text.isNotEmpty) {
                  await _firestoreService.addTask(_currentCompany.id, {
                    'title': titleController.text,
                    'dueDate': selectedDate.toIso8601String(),
                    'isCompleted': false,
                    'author': _userProfile?.displayName ?? 'Unknown',
                    'date': DateTime.now().toIso8601String(),
                  }, isCompany: true);
                  if (mounted) Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteTask(String taskId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      await _firestoreService.db
          .collection('companies')
          .doc(_currentCompany.id)
          .collection('tasks')
          .doc(taskId)
          .delete();
    }
  }

  Widget _buildInvoicesTab() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _firestoreService.getInvoices(_currentCompany.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('No invoices found'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: snapshot.data!.length,
          itemBuilder: (context, index) {
            final invoice = snapshot.data![index];
            final date = DateTime.tryParse(invoice['invoiceDate'] ?? '');
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: const Icon(Icons.receipt_long, color: Colors.green),
                title: Text('Invoice #${invoice['invoiceNumber'] ?? 'N/A'}'),
                subtitle: Text(date != null ? DateFormat.yMMMd().format(date) : 'No date'),
                trailing: Text(
                  '\$${invoice['totalAmount']?.toString() ?? '0.00'}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildActivityTab() {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: _firestoreService.getActivities(_currentCompany.id, isCompany: true),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('No activity recorded'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: snapshot.data!.length,
          itemBuilder: (context, index) {
            final activity = snapshot.data![index];
            final date = DateTime.tryParse(activity['date'] ?? '');
            return _buildActivityTile(activity, date);
          },
        );
      },
    );
  }

  Widget _buildActivityTile(Map<String, dynamic> activity, DateTime? date) {
    IconData icon;
    Color color;
    switch (activity['type']) {
      case 'Note': icon = Icons.note; color = Colors.blue; break;
      case 'Call': icon = Icons.phone; color = Colors.green; break;
      case 'Email': icon = Icons.email; color = Colors.orange; break;
      case 'Appointment': icon = Icons.event; color = Colors.purple; break;
      case 'Status Change': icon = Icons.sync; color = Colors.teal; break;
      default: icon = Icons.info_outline; color = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(activity['notes'] ?? activity['type'] ?? 'Activity'),
        subtitle: Row(
          children: [
            Text(activity['author'] ?? 'System', style: const TextStyle(fontSize: 11)),
            const Spacer(),
            if (date != null) Text(DateFormat.yMMMd().add_jm().format(date), style: const TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }

  void _loadActivities() {
    setState(() {});
  }
}
