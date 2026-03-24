import 'package:flutter/material.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import 'lead_detail_screen.dart';

class LeadListScreen extends StatelessWidget {
  const LeadListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final firestore = FirestoreService();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: StreamBuilder<List<Lead>>(
        stream: firestore.getLeads(),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final leads = snapshot.data!;
          return ListView.builder(
            itemCount: leads.length,
            itemBuilder: (context, index) {
              final lead = leads[index];
              return ListTile(
                title: Text(lead.companyName),
                subtitle: Text(lead.status),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => LeadDetailScreen(lead: lead),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
