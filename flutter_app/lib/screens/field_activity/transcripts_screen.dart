import 'package:flutter/material.dart';
import '../../models/transcript.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import 'transcript_detail_screen.dart';
import 'package:intl/intl.dart';
import '../../widgets/layout/main_layout.dart';

class TranscriptsScreen extends StatefulWidget {
  const TranscriptsScreen({super.key});

  @override
  State<TranscriptsScreen> createState() => _TranscriptsScreenState();
}

class _TranscriptsScreenState extends State<TranscriptsScreen> {
  final _firestoreService = FirestoreService();
  List<Transcript> _allTranscripts = [];
  List<Transcript> _filteredTranscripts = [];
  List<Lead> _allLeads = [];
  bool _isLoading = true;

  final TextEditingController _searchController = TextEditingController();
  DateTimeRange? _selectedDateRange;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _firestoreService.getAllTranscripts(),
        _firestoreService.getAllLeadsForReport(), // To match phone numbers
      ]);

      setState(() {
        _allTranscripts = results[0] as List<Transcript>;
        _allLeads = results[1] as List<Lead>;
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading transcripts: $e')),
        );
      }
    }
  }

  void _applyFilters() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredTranscripts = _allTranscripts.where((t) {
        final lead = _getLeadForTranscript(t);
        final leadMatch = lead?.companyName.toLowerCase().contains(query) ?? false;
        final phoneMatch = t.phoneNumber?.contains(query) ?? false;
        final authorMatch = t.author.toLowerCase().contains(query);

        bool dateMatch = true;
        if (_selectedDateRange != null) {
          dateMatch = t.date.isAfter(_selectedDateRange!.start) &&
              t.date.isBefore(_selectedDateRange!.end.add(const Duration(days: 1)));
        }

        return (leadMatch || phoneMatch || authorMatch) && dateMatch;
      }).toList();
    });
  }

  Lead? _getLeadForTranscript(Transcript transcript) {
    if (transcript.phoneNumber == null) return null;
    return _allLeads.cast<Lead?>().firstWhere(
      (l) => l?.customerPhone != null && l!.customerPhone!.contains(transcript.phoneNumber!),
      orElse: () => null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.of(context).size.width < 1024;
    
    return MainLayout(
      title: 'Call Transcripts',
      currentRoute: '/transcripts',
      showHeader: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Call Transcripts'),
          backgroundColor: const Color(0xFF095c7b),
          foregroundColor: Colors.white,
          leading: isMobile ? Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ) : null,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadData,
            ),
          ],
        ),
        body: Column(
          children: [
            _buildFilterBar(),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredTranscripts.isEmpty
                      ? const Center(child: Text('No transcripts found'))
                      : ListView.builder(
                          itemCount: _filteredTranscripts.length,
                          itemBuilder: (context, index) {
                            final transcript = _filteredTranscripts[index];
                            final lead = _getLeadForTranscript(transcript);
                            return _buildTranscriptCard(transcript, lead);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[100],
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by lead, phone, or user...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _applyFilters();
                      },
                    )
                  : null,
              border: const OutlineInputBorder(),
              filled: true,
              fillColor: Colors.white,
            ),
            onChanged: (val) => _applyFilters(),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _selectDateRange,
                  icon: const Icon(Icons.date_range),
                  label: Text(_selectedDateRange == null
                      ? 'Filter by Date'
                      : '${DateFormat('MMM d').format(_selectedDateRange!.start)} - ${DateFormat('MMM d').format(_selectedDateRange!.end)}'),
                ),
              ),
              if (_selectedDateRange != null) ...[
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    setState(() {
                      _selectedDateRange = null;
                      _applyFilters();
                    });
                  },
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTranscriptCard(Transcript transcript, Lead? lead) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Color(0xFF095c7b),
          child: Icon(Icons.phone, color: Colors.white),
        ),
        title: Text(
          lead?.companyName ?? transcript.phoneNumber ?? 'Unknown Caller',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('User: ${transcript.author}'),
            Text(DateFormat('MMM d, yyyy • h:mm a').format(transcript.date)),
            if (transcript.analysis != null)
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'AI Analyzed • ${transcript.analysis!.sentiment}',
                  style: TextStyle(fontSize: 11, color: Colors.green[800]),
                ),
              ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TranscriptDetailScreen(
                transcript: transcript,
                leadName: lead?.companyName,
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _selectDateRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
      initialDateRange: _selectedDateRange,
    );
    if (range != null) {
      setState(() {
        _selectedDateRange = range;
        _applyFilters();
      });
    }
  }
}
