import 'package:flutter/material.dart';
import '../../models/user_profile.dart';
import '../../services/auth_service.dart';
import '../admin/admin_dashboard_screen.dart';
import '../leads/outbound_leads_screen.dart';
import '../field_activity/capture_visit_screen.dart';
import '../tasks/task_list_screen.dart';
import '../appointments/appointment_list_screen.dart';
import '../profile/user_profile_screen.dart';
import '../reports/reports_dashboard_screen.dart';
import '../field_activity/field_sales_dashboard_screen.dart';
import '../maps/prospecting_map_screen.dart';
import '../reports/signed_customers_screen.dart';
import '../field_activity/transcripts_screen.dart';
import '../routes/route_list_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  UserProfile? _userProfile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final user = AuthService().user.first; // Get current user
    // In a real app, use a proper state management solution like Provider/Riverpod
    // For now, we'll fetch it directly
    final uid = (await user)?.uid;
    if (uid != null) {
      final profile = await AuthService().getUserProfile(uid);
      setState(() {
        _userProfile = profile;
        _isLoading = false;
      });
    } else {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('ProspectPlus'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => AuthService().signOut(),
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: _buildDashboardBody(),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: Color(0xFF095c7b),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Text(
                  'ProspectPlus',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
                Text(
                  _userProfile?.email ?? '',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
          if (_userProfile?.role == 'admin')
            ListTile(
              leading: const Icon(Icons.dashboard),
              title: const Text('Admin Dashboard'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => const AdminDashboardScreen()));
              },
            ),
          ListTile(
            leading: const Icon(Icons.people),
            title: const Text('Outbound Leads'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => const OutboundLeadsScreen()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.star),
            title: const Text('Signed Customers'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => const SignedCustomersScreen()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.phone),
            title: const Text('Call Transcripts'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => const TranscriptsScreen()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.map),
            title: const Text('Territory Map'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => const ProspectingMapScreen()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.bar_chart),
            title: const Text('Reports'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => const ReportsDashboardScreen()));
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('My Profile'),
            onTap: () {
              Navigator.pop(context);
              if (_userProfile != null) {
                Navigator.push(context, MaterialPageRoute(builder: (context) => UserProfileScreen(userProfile: _userProfile!)));
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Log Out'),
            onTap: () => AuthService().signOut(),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardBody() {
    final role = _userProfile?.role?.toLowerCase() ?? '';
    
    if (role == 'field sales' || role == 'field sales admin') {
      return const FieldSalesDashboardScreen();
    }

    return GridView.count(
      crossAxisCount: 2,
      padding: const EdgeInsets.all(16),
      children: [
        _buildDashboardItem(
          'Outbound Leads',
          Icons.people,
          const OutboundLeadsScreen(),
        ),
        _buildDashboardItem(
          'Capture Visit',
          Icons.add_location_alt,
          const CaptureVisitScreen(),
        ),
        _buildDashboardItem(
          'Signed Customers',
          Icons.star,
          const SignedCustomersScreen(),
        ),
        _buildDashboardItem(
          'Call Transcripts',
          Icons.phone,
          const TranscriptsScreen(),
        ),
        _buildDashboardItem(
          'Reports',
          Icons.analytics,
          const ReportsDashboardScreen(),
        ),
        _buildDashboardItem(
          'Routes',
          Icons.route,
          const RouteListScreen(),
        ),
        _buildDashboardItem(
          'Tasks',
          Icons.task_alt,
          const TaskListScreen(),
        ),
        _buildDashboardItem(
          'Appointments',
          Icons.calendar_month,
          const AppointmentListScreen(),
        ),
      ],
    );
  }

  Widget _buildDashboardItem(String title, IconData icon, Widget screen) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (context) => screen));
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white,
                const Color(0xFF095c7b).withOpacity(0.05),
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF095c7b).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 40, color: const Color(0xFF095c7b)),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF095c7b),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
