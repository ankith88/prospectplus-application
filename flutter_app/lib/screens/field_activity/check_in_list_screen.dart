import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/firestore_service.dart';
import '../../models/lead.dart';
import '../../widgets/layout/main_layout.dart';
import '../leads/lead_detail_screen.dart';
import '../../utils/error_utils.dart';

class CheckInListScreen extends StatefulWidget {
  const CheckInListScreen({super.key});

  @override
  State<CheckInListScreen> createState() => _CheckInListScreenState();
}

class _CheckInListScreenState extends State<CheckInListScreen> {
  final _firestoreService = FirestoreService();
  final Map<String, Lead> _leadCache = {};
  final List<String> _loadingLeads = [];

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      title: 'Check-In History',
      currentRoute: '/check-ins',
      showHeader: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Check-In History'),
          backgroundColor: const Color(0xFF095c7b),
          foregroundColor: Colors.white,
        ),
        body: StreamBuilder<List<Map<String, dynamic>>>(
          stream: _firestoreService.getRecentCheckIns(),
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Error loading check-ins: ${snapshot.error}'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ErrorUtils.showSnackBar(context, snapshot.error.toString()),
                        child: const Text('View Error Details / Create Index'),
                      ),
                    ],
                  ),
                ),
              );
            }

            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }

            final activities = snapshot.data!;
            if (activities.isEmpty) {
              return const Center(child: Text('No recent check-in activity found.'));
            }

            return ListView.builder(
              itemCount: activities.length,
              itemBuilder: (context, index) {
                final activity = activities[index];
                final leadId = activity['leadId'] as String?;
                
                if (leadId == null) return const SizedBox.shrink();

                // Trigger lead fetch if not in cache
                if (!_leadCache.containsKey(leadId) && !_loadingLeads.contains(leadId)) {
                  _loadingLeads.add(leadId);
                  _firestoreService.getLeadById(leadId).then((lead) {
                    if (lead != null && mounted) {
                      setState(() {
                        _leadCache[leadId] = lead;
                        _loadingLeads.remove(leadId);
                      });
                    }
                  });
                }

                final lead = _leadCache[leadId];
                final dateStr = activity['date'] ?? '';
                final date = DateTime.tryParse(dateStr);
                final formattedDate = date != null ? DateFormat.yMMMd().add_jm().format(date) : dateStr;
                
                final notes = activity['notes'] ?? 'No details provided';
                final type = activity['type'] ?? 'Update';
                final score = activity['discoveryScore'];

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getTypeColor(type).withOpacity(0.1),
                      child: Icon(_getTypeIcon(type), color: _getTypeColor(type), size: 20),
                    ),
                    title: Text(
                      lead?.companyName ?? 'Loading...',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(notes, maxLines: 2, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(formattedDate, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            if (score != null) ...[
                              const SizedBox(width: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.orange.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('Score: $score', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange)),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                    onTap: lead != null ? () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead)),
                    ) : null,
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'Update': return Icons.edit_note;
      case 'Visit': return Icons.location_on;
      case 'Note': return Icons.note;
      case 'Call': return Icons.phone;
      default: return Icons.history;
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'Update': return Colors.blue;
      case 'Visit': return Colors.green;
      case 'Note': return Colors.orange;
      case 'Call': return Colors.purple;
      default: return Colors.grey;
    }
  }
}
