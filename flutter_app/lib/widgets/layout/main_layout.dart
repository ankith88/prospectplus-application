import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../models/user_profile.dart';
import 'app_header.dart';
import 'sidebar.dart';
import '../../services/firestore_service.dart';
import '../../widgets/daily_deployment_dialog.dart';
import '../../widgets/deployment_banner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class MainLayout extends StatefulWidget {
  final Widget child;
  final String title;
  final String currentRoute;
  final Widget? floatingActionButton;
  final EdgeInsetsGeometry? padding;
  final bool showHeader;

  const MainLayout({
    super.key,
    required this.child,
    required this.title,
    required this.currentRoute,
    this.floatingActionButton,
    this.padding,
    this.showHeader = true,
  });

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  final AuthService _authService = AuthService();
  final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();
  final FirestoreService _firestoreService = FirestoreService();
  UserProfile? _userProfile;
  bool _isLoading = true;
  bool _hasDeployment = true;
  bool _showLogDialog = false;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final user = _authService.currentUser;
    if (user != null) {
      final profile = await _authService.getUserProfile(user.uid);
      if (mounted) {
        setState(() {
          _userProfile = profile;
        });
        await _checkDeploymentStatus();
        setState(() {
          _isLoading = false;
        });
      }
    } else {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _checkDeploymentStatus() async {
    if (_userProfile == null || _userProfile!.role != 'Field Sales') return;

    final deployment = await _firestoreService.getTodayDeploymentForUser(_userProfile!.id);
    final prefs = await SharedPreferences.getInstance();
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final skippedDate = prefs.getString('deployment_skipped_date');

    if (mounted) {
      setState(() {
        _hasDeployment = deployment != null;
        _showLogDialog = !_hasDeployment && skippedDate != today;
      });

      if (_showLogDialog) {
        _triggerDeploymentDialog();
      }
    }
  }

  void _triggerDeploymentDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => DailyDeploymentDialog(
        userProfile: _userProfile!,
        onComplete: (success) {
          Navigator.pop(context);
          setState(() {
            _showLogDialog = false;
            if (success) _hasDeployment = true;
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final bool isDesktop = MediaQuery.of(context).size.width >= 1024;

    return Scaffold(
      key: scaffoldKey,
      floatingActionButton: widget.floatingActionButton,
      drawer: !isDesktop
          ? Drawer(
              child: Sidebar(
                currentRoute: widget.currentRoute,
                userProfile: _userProfile,
                onLogArea: _triggerDeploymentDialog,
                onNavigate: (route) {
                  if (widget.currentRoute == route) return;
                  Navigator.pop(context); // Close drawer
                  Navigator.pushReplacementNamed(context, route);
                },
              ),
            )
          : null,
      body: Row(
        children: [
          if (isDesktop)
            Sidebar(
              currentRoute: widget.currentRoute,
              userProfile: _userProfile,
              onLogArea: _triggerDeploymentDialog,
              onNavigate: (route) {
                if (widget.currentRoute == route) return;
                Navigator.pushReplacementNamed(context, route);
              },
            ),
          Expanded(
            child: SafeArea(
              child: Column(
                children: [
                    if (widget.showHeader)
                      AppHeader(
                        title: widget.title,
                        isMobile: !isDesktop,
                        scaffoldKey: scaffoldKey,
                      ),
                    if (!_hasDeployment && _userProfile?.role == 'Field Sales')
                      DeploymentBanner(
                        onAction: _triggerDeploymentDialog,
                      ),
                    Expanded(
                      child: Container(
                        padding: widget.padding ??
                            (widget.showHeader
                                ? EdgeInsets.all(isDesktop ? 24 : 16)
                                : EdgeInsets.zero),
                        child: widget.child,
                      ),
                    ),
                  _buildFooter(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFe5e7eb)),
        ),
      ),
      child: Center(
        child: Text(
          '© ${DateTime.now().year} MailPlus Pty. Ltd. All rights reserved.',
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
      ),
    );
  }
}
