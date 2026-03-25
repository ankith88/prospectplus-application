import 'package:flutter/material.dart';
import '../../models/transcript.dart';
import 'package:intl/intl.dart';
import 'dart:convert';

class TranscriptDetailScreen extends StatelessWidget {
  final Transcript transcript;
  final String? leadName;

  const TranscriptDetailScreen({
    super.key,
    required this.transcript,
    this.leadName,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transcript Detail'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 24),
            if (transcript.analysis != null) ...[
              _buildAnalysisSection(),
              const SizedBox(height: 24),
            ],
            const Text(
              'Full Dialogue',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildDialogueList(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.business, color: Color(0xFF095c7b)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    leadName ?? transcript.phoneNumber ?? 'Unknown',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoItem(Icons.person, 'Rep', transcript.author),
                _buildInfoItem(Icons.calendar_today, 'Date', DateFormat('MMM d').format(transcript.date)),
                _buildInfoItem(Icons.access_time, 'ID', transcript.callId.substring(0, 8)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 20, color: Colors.grey),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildAnalysisSection() {
    final analysis = transcript.analysis!;
    return Card(
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: Colors.blue),
                const SizedBox(width: 8),
                const Text(
                  'AI Analysis',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.blue[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    analysis.sentiment,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(analysis.summary),
            const SizedBox(height: 16),
            const Text('Action Items:', style: TextStyle(fontWeight: FontWeight.bold)),
            ...analysis.actionItems.map((item) => Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, size: 16, color: Colors.blue),
                  const SizedBox(width: 8),
                  Expanded(child: Text(item, style: const TextStyle(fontSize: 13))),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildDialogueList() {
    try {
      final List<dynamic> utterances = jsonDecode(transcript.content);
      return Column(
        children: utterances.map((u) {
          final String speaker = u['speaker'] ?? u['participant_type'] ?? 'Speaker';
          final String text = u['text'] ?? '';
          final bool isCustomer = speaker.toLowerCase() == 'customer';

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            alignment: isCustomer ? Alignment.centerLeft : Alignment.centerRight,
            decoration: BoxDecoration(
              color: isCustomer ? Colors.grey[100] : const Color(0xFF095c7b).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: isCustomer ? CrossAxisAlignment.start : CrossAxisAlignment.end,
              children: [
                Text(
                  speaker,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isCustomer ? Colors.grey[600] : const Color(0xFF095c7b),
                  ),
                ),
                const SizedBox(height: 4),
                Text(text),
              ],
            ),
          );
        }).toList(),
      );
    } catch (e) {
      return Text('Could not load dialogue: ${transcript.content}');
    }
  }
}
