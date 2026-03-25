import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/visit_note.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';

class VisitNotesListScreen extends StatefulWidget {
  const VisitNotesListScreen({super.key});

  @override
  State<VisitNotesListScreen> createState() => _VisitNotesListScreenState();
}

class _VisitNotesListScreenState extends State<VisitNotesListScreen> {
  final _firestoreService = FirestoreService();
  final _authService = AuthService();
  List<VisitNote> _visitNotes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    try {
      final user = await _authService.user.first;
      if (user != null) {
        final notes = await _firestoreService.getVisitNotes(uid: user.uid);
        setState(() {
          _visitNotes = notes..sort((a, b) => b.createdAt.compareTo(a.createdAt));
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading notes: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Visit Notes'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _visitNotes.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadNotes,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _visitNotes.length,
                    itemBuilder: (context, index) {
                      final note = _visitNotes[index];
                      return _buildVisitNoteCard(note);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.note_alt_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text('No visit notes recorded yet.', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildVisitNoteCard(VisitNote note) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    note.companyName ?? 'Unknown Business',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                Text(
                  DateFormat.yMMMd().format(note.createdAt),
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(note.content, maxLines: 3, overflow: TextOverflow.ellipsis),
            if (note.outcome.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  Chip(
                    label: Text(note.outcome['type'] ?? 'No Outcome', style: const TextStyle(fontSize: 10)),
                    backgroundColor: const Color(0xFF095c7b).withOpacity(0.1),
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
                  if (note.status != null)
                    Chip(
                      label: Text(note.status!, style: const TextStyle(fontSize: 10)),
                      backgroundColor: Colors.green.withOpacity(0.1),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                ],
              ),
            ],
            if (note.imageUrls.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: SizedBox(
                  height: 60,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: note.imageUrls.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 8),
                    itemBuilder: (context, index) => ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: Image.network(note.imageUrls[index], width: 60, height: 60, fit: BoxFit.cover),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
