import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../models/user_profile.dart';
import 'app_header.dart';
import 'sidebar.dart';

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
  UserProfile? _userProfile;
  bool _isLoading = true;

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
          _isLoading = false;
        });
      }
    } else {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final bool isDesktop = MediaQuery.of(context).size.width >= 1024;
    final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

    return Scaffold(
      key: scaffoldKey,
      floatingActionButton: widget.floatingActionButton,
      drawer: !isDesktop
          ? Drawer(
              child: Sidebar(
                currentRoute: widget.currentRoute,
                userProfile: _userProfile,
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
