import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/appointment.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../leads/lead_detail_screen.dart';
import '../../widgets/layout/main_layout.dart';
import '../../services/auth_service.dart';
import '../../models/user_profile.dart';

class AppointmentListScreen extends StatefulWidget {
  const AppointmentListScreen({super.key});

  @override
  State<AppointmentListScreen> createState() => _AppointmentListScreenState();
}

class _AppointmentListScreenState extends State<AppointmentListScreen> {
  final _authService = AuthService();
  final _firestoreService = FirestoreService();
  List<Appointment> _allAppointments = [];
  List<Appointment> _filteredAppointments = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _statusFilter = 'All';
  String _salesRepFilter = 'All';
  UserProfile? _userProfile;
  List<String> _allSalesReps = [];

  @override
  void initState() {
    super.initState();
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    try {
      final user = _authService.currentUser;
      if (_userProfile == null && user != null) {
        _userProfile = await _authService.getUserProfile(user.uid);
      }

      final appointments = await _firestoreService.getAllAppointments();
      
      // Extract unique sales reps for the filter
      final reps = appointments
          .map((a) => a.assignedTo)
          .where((name) => name.isNotEmpty)
          .cast<String>()
          .toSet()
          .toList()
        ..sort();

      setState(() {
        _allAppointments = appointments;
        _allSalesReps = ['All', ...reps];
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading appointments: $e')),
        );
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredAppointments = _allAppointments.where((appt) {
        final nameMatch = appt.leadName?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? true;
        final statusMatch = _statusFilter == 'All' || appt.appointmentStatus == _statusFilter;
        final repMatch = _salesRepFilter == 'All' || appt.assignedTo == _salesRepFilter;
        return nameMatch && statusMatch && repMatch;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      title: 'Appointments',
      currentRoute: '/appointments',
      showHeader: false,
      child: Scaffold(
      appBar: AppBar(
        title: const Text('Appointments'),
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
              onChanged: (value) {
                _searchQuery = value;
                _applyFilters();
              },
              decoration: InputDecoration(
                hintText: 'Search leads...',
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAppointments,
              child: _filteredAppointments.isEmpty
                  ? const Center(child: Text('No appointments found'))
                  : ListView.builder(
                      itemCount: _filteredAppointments.length,
                      itemBuilder: (context, index) {
                        final appt = _filteredAppointments[index];
                        final date = DateTime.tryParse(appt.duedate);
                        final dateStr = date != null ? DateFormat.yMMMd().format(date) : appt.duedate;
                        final timeStr = appt.starttime.split(' ').last;

                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: _getStatusColor(appt.appointmentStatus).withOpacity(0.2),
                              child: Icon(Icons.calendar_today, color: _getStatusColor(appt.appointmentStatus)),
                            ),
                            title: Text(appt.leadName ?? 'Unknown Lead', style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('$dateStr at $timeStr'),
                                Text('Assigned to: ${appt.assignedTo}', style: const TextStyle(fontSize: 12)),
                              ],
                            ),
                            trailing: _buildStatusBadge(appt.appointmentStatus),
                            onTap: () async {
                              final leadId = appt.leadId;
                              if (leadId.isNotEmpty) {
                                showDialog(
                                  context: context,
                                  barrierDismissible: false,
                                  builder: (context) => const Center(child: CircularProgressIndicator()),
                                );
                                final Lead? lead = await _firestoreService.getLeadById(leadId);
                                if (mounted) {
                                  Navigator.pop(context); // Dismiss loader
                                  if (lead != null) {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead)),
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Lead not found')),
                                    );
                                  }
                                }
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Lead ID missing for this appointment')),
                                );
                              }
                            },
                          ),
                        );
                      },
                    ),
            ),
      ),
    );
  }

  Widget _buildStatusBadge(String? status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _getStatusColor(status)),
      ),
      child: Text(
        status ?? 'Pending',
        style: TextStyle(
          color: _getStatusColor(status),
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'Completed': return Colors.green;
      case 'Cancelled': return Colors.red;
      case 'No Show': return Colors.orange;
      case 'Rescheduled': return Colors.blue;
      default: return Colors.grey;
    }
  }

  void _showFilterDialog() {
    final isAdmin = _userProfile?.role == 'field-sales-admin' || _userProfile?.role == 'admin';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Appointments'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Status', style: TextStyle(fontWeight: FontWeight.bold)),
              ...['All', 'Pending', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'].map((s) => 
                RadioListTile<String>(
                  title: Text(s),
                  value: s,
                  groupValue: _statusFilter,
                  onChanged: (value) {
                    setState(() => _statusFilter = value!);
                    _applyFilters();
                    Navigator.pop(context);
                  },
                )
              ).toList(),
              if (isAdmin) ...[
                const Divider(),
                const Text('Sales Rep', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _salesRepFilter,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: _allSalesReps.map((rep) => DropdownMenuItem(value: rep, child: Text(rep))).toList(),
                  onChanged: (value) {
                    setState(() => _salesRepFilter = value!);
                    _applyFilters();
                    Navigator.pop(context);
                  },
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
