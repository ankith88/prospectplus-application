import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool isMobile;
  final GlobalKey<ScaffoldState>? scaffoldKey;

  const AppHeader({
    super.key,
    required this.title,
    this.isMobile = false,
    this.scaffoldKey,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFe5e7eb)),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          if (isMobile)
            IconButton(
              icon: const Icon(Icons.menu, color: AppTheme.foreground),
              onPressed: () => scaffoldKey?.currentState?.openDrawer(),
            ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppTheme.foreground,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (!isMobile) ...[
            const SizedBox(width: 16),
            _buildSearchBox(),
          ],
          const SizedBox(width: 16),
          _buildNotificationBell(),
          const SizedBox(width: 16),
          _buildUserAvatar(),
        ],
      ),
    );
  }

  Widget _buildSearchBox() {
    return Container(
      width: 240,
      height: 36,
      decoration: BoxDecoration(
        color: const Color(0xFFf3f4f6),
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(Icons.search, size: 18, color: Colors.grey[500]),
          const SizedBox(width: 8),
          Text(
            'Search leads...',
            style: TextStyle(color: Colors.grey[500], fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationBell() {
    return Stack(
      children: [
        Icon(Icons.notifications_none_outlined, color: Colors.grey[600]),
        Positioned(
          right: 0,
          top: 0,
          child: Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppTheme.destructive,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUserAvatar() {
    return CircleAvatar(
      radius: 16,
      backgroundColor: Colors.grey[200],
      child: Icon(Icons.person_outline, size: 20, color: Colors.grey[600]),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(56);
}
