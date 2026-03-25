import 'package:flutter/material.dart';
import '../../services/firestore_service.dart';
import '../../models/lead.dart';
import '../../models/appointment.dart';
import 'package:fl_chart/fl_chart.dart';

class OutboundReportScreen extends StatefulWidget {
  const OutboundReportScreen({super.key});

  @override
  State<OutboundReportScreen> createState() => _OutboundReportScreenState();
}

class _OutboundReportScreenState extends State<OutboundReportScreen> {
  final _firestoreService = FirestoreService();
  bool _isLoading = true;

  List<Lead> _allLeads = [];
  List<Map<String, dynamic>> _allActivities = [];
  List<Appointment> _allAppointments = [];

  // Filtered lists
  List<Lead> _filteredLeads = [];
  List<Map<String, dynamic>> _filteredActivities = [];
  List<Appointment> _filteredAppointments = [];

  DateTimeRange? _activityDateRange;
  
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _firestoreService.getCombinedLeads(),
        _firestoreService.getAllActivities(),
        _firestoreService.getAllAppointments(),
      ]);

      setState(() {
        _allLeads = results[0] as List<Lead>;
        _allActivities = results[1] as List<Map<String, dynamic>>;
        _allAppointments = results[2] as List<Appointment>;
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading report: $e')));
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredActivities = _allActivities.where((activity) {
        if (_activityDateRange == null) return true;
        final dateStr = activity['date'] as String?;
        if (dateStr == null) return false;
        final date = DateTime.parse(dateStr);
        return date.isAfter(_activityDateRange!.start) && 
               date.isBefore(_activityDateRange!.end.add(const Duration(days: 1)));
      }).toList();

      _filteredAppointments = _allAppointments.where((appt) {
        if (_activityDateRange == null) return true;
        final apptDate = DateTime.tryParse(appt.duedate);
        if (apptDate == null) return false;
        return apptDate.isAfter(_activityDateRange!.start) &&
               apptDate.isBefore(_activityDateRange!.end.add(const Duration(days: 1)));
      }).toList();

      // For leads, we'll use allLeads for now as per web logic unless specific filters are applied
      _filteredLeads = _allLeads;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final stats = _calculateStats();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Outbound Reporting'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      backgroundColor: const Color(0xFFd0dfcd),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatGrid(stats),
            const SizedBox(height: 24),
            _buildChartSection('Appointment Outcomes', _buildAppointmentOutcomeChart()),
            const SizedBox(height: 24),
            _buildChartSection('Call Outcomes', _buildCallOutcomeChart()),
            const SizedBox(height: 24),
            _buildChartSection('Team Performance', _buildTeamPerformanceChart()),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _calculateStats() {
    final totalEngagement = _filteredActivities.length;
    final totalAppts = _filteredAppointments.length;
    final wonCount = _filteredLeads.where((l) => l.status == 'Won').length;
    final quoteCount = _filteredLeads.where((l) => l.status == 'Quote Sent' || l.status == 'Prospect Opportunity').length;
    final trialCount = _filteredLeads.where((l) => l.status == 'Trialing ShipMate').length;
    final fieldSourcedCount = _filteredLeads.where((l) => l.visitNoteID != null && l.visitNoteID!.isNotEmpty).length;
    
    // Engagement Conversion: Unique Leads with Appts / Unique Leads Called
    final leadsCalledIds = _filteredActivities.map((a) => a['leadId']).toSet();
    final leadsAppointedIds = _filteredAppointments.map((a) => a.leadId).toSet();
    
    // Intersection: Leads that were called AND appointed in this range
    final uniqueLeadsCalled = leadsCalledIds.length;
    final intersection = leadsCalledIds.intersection(leadsAppointedIds).length;
    
    final engConv = uniqueLeadsCalled > 0 ? (intersection / uniqueLeadsCalled) * 100 : 0.0;
    
    return {
      'Engagement': totalEngagement,
      'Appointments': totalAppts,
      'Won': wonCount,
      'Quotes': quoteCount,
      'Trials': trialCount,
      'FieldSourced': fieldSourcedCount,
      'Conv %': engConv,
    };
  }

  Widget _buildStatGrid(Map<String, dynamic> stats) {
    return Column(
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _buildStatCard('Engagement', stats['Engagement'].toString(), Icons.phone, Colors.blue),
            _buildStatCard('Appointments', stats['Appointments'].toString(), Icons.calendar_today, Colors.orange),
            _buildStatCard('Won Customers', stats['Won'].toString(), Icons.star, Colors.green),
            _buildStatCard('Engagement %', '${stats['Conv %'].toStringAsFixed(1)}%', Icons.trending_up, Colors.purple),
          ],
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.2,
          children: [
            _buildStatCard('Quotes', stats['Quotes'].toString(), Icons.send, Colors.indigo),
            _buildStatCard('Trials', stats['Trials'].toString(), Icons.whatshot, Colors.red),
            _buildStatCard('Field Sc.', stats['FieldSourced'].toString(), Icons.assignment_turned_in, Colors.teal),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Widget _buildChartSection(String title, Widget chart) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(height: 250, child: chart),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentOutcomeChart() {
    final outcomes = <String, int>{};
    for (var appt in _filteredAppointments) {
      final key = appt.appointmentStatus ?? 'Pending';
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }

    if (outcomes.isEmpty) return const Center(child: Text('No data'));

    final sections = outcomes.entries.map((e) => PieChartSectionData(
      value: e.value.toDouble(),
      title: '${(e.value / _filteredAppointments.length * 100).toStringAsFixed(0)}%',
      radius: 60,
      titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
      color: Colors.primaries[outcomes.keys.toList().indexOf(e.key) % Colors.primaries.length],
    )).toList();

    return PieChart(PieChartData(sections: sections, centerSpaceRadius: 40));
  }

  Widget _buildCallOutcomeChart() {
    final outcomes = <String, int>{};
    for (var activity in _filteredActivities) {
      final notes = activity['notes'] as String? ?? '';
      String outcome = 'Other';
      final match = RegExp(r'Outcome: ([^.]+)').firstMatch(notes);
      if (match != null) {
        outcome = match.group(1)!;
      }
      outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
    }

    if (outcomes.isEmpty) return const Center(child: Text('No data'));

    final sections = outcomes.entries.map((e) => PieChartSectionData(
      value: e.value.toDouble(),
      title: '${(e.value / _filteredActivities.length * 100).toStringAsFixed(0)}%',
      radius: 60,
      titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
      color: Colors.accents[outcomes.keys.toList().indexOf(e.key) % Colors.accents.length],
    )).toList();

    return PieChart(PieChartData(sections: sections, centerSpaceRadius: 40));
  }

  Widget _buildTeamPerformanceChart() {
    final performance = <String, int>{};
    for (var activity in _filteredActivities) {
      final dialer = activity['author'] as String? ?? 'Unknown';
      performance[dialer] = (performance[dialer] ?? 0) + 1;
    }

    if (performance.isEmpty) return const Center(child: Text('No data'));

    final sortedItems = performance.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: sortedItems.first.value.toDouble() * 1.2,
        barGroups: sortedItems.asMap().entries.map((e) {
          return BarChartGroupData(
            x: e.key,
            barRods: [
              BarChartRodData(
                fromY: 0,
                toY: e.value.value.toDouble(),
                color: const Color(0xFF095c7b),
                width: 16,
              ),
            ],
          );
        }).toList(),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= sortedItems.length) return const Text('');
                final name = sortedItems[value.toInt()].key;
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(name.split(' ').first, style: const TextStyle(fontSize: 10)),
                );
              },
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
      ),
    );
  }

  Future<void> _selectDateRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
      initialDateRange: _activityDateRange,
    );
    if (range != null) {
      setState(() {
        _activityDateRange = range;
        _applyFilters();
      });
    }
  }
}
