import 'package:flutter/material.dart';
import '../../models/user_profile.dart';
import '../../services/auth_service.dart';
import '../leads/outbound_leads_screen.dart';
import '../field_activity/capture_visit_screen.dart';
import '../tasks/task_list_screen.dart';
import '../appointments/appointment_list_screen.dart';
import '../reports/reports_dashboard_screen.dart';
import '../field_activity/field_sales_dashboard_screen.dart';
import '../reports/signed_customers_screen.dart';
import '../field_activity/transcripts_screen.dart';
import '../routes/route_list_screen.dart';
import '../../widgets/layout/main_layout.dart';

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

    final role = _userProfile?.role?.toLowerCase() ?? '';
    if (role == 'field sales' || role == 'field sales admin') {
      return const CaptureVisitScreen();
    }

    return MainLayout(
      title: 'Dashboard',
      currentRoute: '/admin/dashboard',
      child: _buildDashboardBody(),
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
