import 'package:flutter/material.dart';

class DeploymentBanner extends StatelessWidget {
  final VoidCallback onAction;

  const DeploymentBanner({
    super.key,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.amber[100],
        border: Border(
          bottom: BorderSide(color: Colors.amber[200]!),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.amber[800]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              "You haven't logged your area deployment for today yet. Logging your area helps with reporting.",
              style: TextStyle(
                color: Colors.amber[900],
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: onAction,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber[700],
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Log Now', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
