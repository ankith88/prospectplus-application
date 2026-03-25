import 'package:flutter/material.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildStatCard(context, 'Total Leads', '1,234', Icons.people),
          const SizedBox(height: 16),
          _buildStatCard(context, 'Active Routes', '12', Icons.route),
          const SizedBox(height: 16),
          _buildStatCard(context, 'Completed Visits', '456', Icons.check_circle),
          const SizedBox(height: 24),
          Text(
            'System Activity',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          _buildActivityItem('User logged in', '2 minutes ago'),
          _buildActivityItem('New lead created', '15 minutes ago'),
          _buildActivityItem('Route completed', '1 hour ago'),
        ],
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, size: 40, color: const Color(0xFF095c7b)),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF095c7b),
                )),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(String title, String time) {
    return ListTile(
      leading: const Icon(Icons.history),
      title: Text(title),
      subtitle: Text(time),
    );
  }
}
