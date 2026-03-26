import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../models/user_profile.dart';
import '../../theme/app_theme.dart';

class Sidebar extends StatelessWidget {
  final String currentRoute;
  final UserProfile? userProfile;
  final Function(String) onNavigate;

  const Sidebar({
    super.key,
    required this.currentRoute,
    this.userProfile,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    void navigate(String route) {
      if (currentRoute == route) return;
      onNavigate(route);
    }

    final role = userProfile?.role ?? '';
    
    final canCaptureVisit = ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Franchisee'].contains(role);
    final canProcessVisits = ['admin', 'Lead Gen', 'Lead Gen Admin', 'Field Sales', 'Field Sales Admin', 'Franchisee'].contains(role);
    final canViewVisits = canCaptureVisit || canProcessVisits;
    final canViewD2D = ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].contains(role);
    final canViewReporting = ['admin', 'user', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Franchisee', 'Sales Manager'].contains(role);
    final canViewHistory = ['admin', 'user', 'Field Sales', 'Field Sales Admin', 'Franchisee'].contains(role);
    final canCreateLead = ['admin', 'Lead Gen', 'Lead Gen Admin', 'Field Sales Admin'].contains(role);
    final canViewOutboundLeads = ['admin', 'user', 'Lead Gen', 'Lead Gen Admin', 'Franchisee'].contains(role);

    return Container(
      width: 256,
      color: AppTheme.sidebarBackground,
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                if (role == 'admin')
                  _buildMenuItem(
                    icon: Icons.dashboard_outlined,
                    label: 'Admin Dashboard',
                    route: '/admin/dashboard',
                    onTap: () => navigate('/admin/dashboard'),
                  ),
                
                _buildGroupLabel('Leads'),
                if (canCreateLead)
                  _buildMenuItem(
                    icon: Icons.add_circle_outline,
                    label: 'New Lead',
                    route: '/leads/new',
                    onTap: () => navigate('/leads/new'),
                  ),
                if (canViewOutboundLeads)
                  _buildMenuItem(
                    icon: Icons.business_center_outlined,
                    label: 'Outbound Leads',
                    route: '/leads',
                    onTap: () => navigate('/leads'),
                  ),
                if (role == 'admin' || role == 'Lead Gen Admin' || role == 'Field Sales' || role == 'Franchisee')
                  _buildMenuItem(
                    icon: Icons.star_outline,
                    label: 'Signed Customers',
                    route: '/signed-customers',
                    onTap: () => navigate('/signed-customers'),
                  ),
                if (!role.contains('Lead Gen') && !role.contains('Franchisee'))
                  _buildMenuItem(
                    icon: Icons.archive_outlined,
                    label: 'Archived Leads',
                    route: '/leads/archive',
                    onTap: () => navigate('/leads/archive'),
                  ),

                if (canViewVisits) ...[
                  _buildGroupLabel('Field Visits'),
                  if (canCaptureVisit)
                    _buildMenuItem(
                      icon: Icons.add_location_alt_outlined,
                      label: 'Capture Visit',
                      route: '/capture-visit',
                      onTap: () => navigate('/capture-visit'),
                    ),
                  if (canProcessVisits)
                    _buildMenuItem(
                      icon: Icons.file_present_outlined,
                      label: 'Visit Notes',
                      route: '/visit-notes',
                      onTap: () => navigate('/visit-notes'),
                    ),
                ],

                if (canViewD2D) ...[
                  _buildGroupLabel('Routes'),
                  _buildMenuItem(
                    icon: Icons.save_outlined,
                    label: 'Saved Routes',
                    route: '/saved-routes',
                    onTap: () => navigate('/saved-routes'),
                  ),
                  _buildMenuItem(
                    icon: Icons.grid_view_outlined,
                    label: 'Prospecting Areas',
                    route: '/prospecting-areas',
                    onTap: () => navigate('/prospecting-areas'),
                  ),
                  _buildMenuItem(
                    icon: Icons.check_circle_outline,
                    label: 'Completed Routes',
                    route: '/completed-routes',
                    onTap: () => navigate('/completed-routes'),
                  ),
                ],

                _buildGroupLabel('Maps'),
                if (!role.contains('Franchisee'))
                  _buildMenuItem(
                    icon: Icons.map_outlined,
                    label: 'Territory Map',
                    route: '/leads/map',
                    onTap: () => navigate('/leads/map'),
                  ),
                if (canViewD2D)
                  _buildMenuItem(
                    icon: Icons.location_on_outlined,
                    label: 'D2D Map',
                    route: '/field-sales',
                    onTap: () => navigate('/field-sales'),
                  ),

                if (canViewReporting) ...[
                  _buildGroupLabel('Reporting'),
                  _buildMenuItem(
                    icon: Icons.bar_chart_outlined,
                    label: 'Outbound Reporting',
                    route: '/reports',
                    onTap: () => navigate('/reports'),
                  ),
                  _buildMenuItem(
                    icon: Icons.analytics_outlined,
                    label: 'Field Activity',
                    route: '/field-activity-report',
                    onTap: () => navigate('/field-activity-report'),
                  ),
                ],

                if (canViewHistory) ...[
                  _buildGroupLabel('History'),
                  _buildMenuItem(
                    icon: Icons.calendar_month_outlined,
                    label: 'Appointments',
                    route: '/appointments',
                    onTap: () => navigate('/appointments'),
                  ),
                  if (!role.contains('Field Sales') && !role.contains('Franchisee')) ...[
                    _buildMenuItem(
                      icon: Icons.phone_outlined,
                      label: 'All Calls',
                      route: '/calls',
                      onTap: () => navigate('/calls'),
                    ),
                    _buildMenuItem(
                      icon: Icons.description_outlined,
                      label: 'All Transcripts',
                      route: '/transcripts',
                      onTap: () => navigate('/transcripts'),
                    ),
                  ],
                  if (canViewD2D)
                    _buildMenuItem(
                      icon: Icons.fact_check_outlined,
                      label: 'Check-ins',
                      route: '/check-ins',
                      onTap: () => navigate('/check-ins'),
                    ),
                ],
              ],
            ),
          ),
          _buildFooter(context),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppTheme.sidebarBorder),
        ),
      ),
      child: Row(
        children: [
          Image.network(
            'https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png',
            height: 32,
            width: 32,
          ),
          const SizedBox(width: 12),
          const Text(
            'ProspectPlus',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGroupLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, top: 16, bottom: 4),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: AppTheme.sidebarForeground.withOpacity(0.5),
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.1,
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String label,
    required String route,
    VoidCallback? onTap,
  }) {
    final bool isActive = currentRoute == route;
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: InkWell(
        onTap: onTap ?? () => onNavigate(route),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isActive ? AppTheme.sidebarAccent : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 20,
                color: isActive ? AppTheme.sidebarAccentForeground : AppTheme.sidebarForeground,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: isActive ? AppTheme.sidebarAccentForeground : AppTheme.sidebarForeground,
                    fontSize: 13,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppTheme.sidebarBorder),
        ),
      ),
      child: Column(
        children: [
          if (userProfile != null)
             ListTile(
               contentPadding: EdgeInsets.zero,
               leading: CircleAvatar(
                 backgroundColor: AppTheme.sidebarAccent,
                 radius: 16,
                 child: Text(
                   userProfile!.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                   style: const TextStyle(
                     color: AppTheme.sidebarAccentForeground,
                     fontSize: 12,
                     fontWeight: FontWeight.bold,
                   ),
                 ),
               ),
               title: Text(
                 userProfile!.displayName ?? 'User',
                 style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
               ),
               subtitle: Text(
                 userProfile!.email,
                 style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11),
                 overflow: TextOverflow.ellipsis,
               ),
             ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: () => AuthService().signOut(),
            icon: const Icon(Icons.logout, size: 16, color: Colors.white70),
            label: const Text('Logout', style: TextStyle(color: Colors.white70, fontSize: 12)),
            style: TextButton.styleFrom(
              minimumSize: const Size(double.infinity, 36),
              alignment: Alignment.centerLeft,
            ),
          ),
        ],
      ),
    );
  }
}
