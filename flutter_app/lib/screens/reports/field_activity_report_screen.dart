import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/visit_note.dart';
import '../../models/lead.dart';
import '../../models/appointment.dart';
import '../../models/upsell.dart';
import '../../models/user_profile.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/firestore_service.dart';
import 'report_stats.dart';

class FieldActivityReportScreen extends StatefulWidget {
  const FieldActivityReportScreen({super.key});

  @override
  State<FieldActivityReportScreen> createState() => _FieldActivityReportScreenState();
}

class _FieldActivityReportScreenState extends State<FieldActivityReportScreen> {
  final _firestoreService = FirestoreService();

  List<VisitNote> _allVisitNotes = [];
  List<VisitNote> _filteredVisitNotes = [];
  List<Lead> _allLeads = [];
  List<Appointment> _allAppointments = [];
  List<Upsell> _allUpsells = [];
  List<UserProfile> _allUsers = [];
  List<Map<String, dynamic>> _allActivities = [];

  bool _isLoading = true;
  DateTimeRange? _selectedDateRange;
  String _selectedRep = 'All';
  String _selectedFranchisee = 'All';
  String _selectedOutcome = 'All';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _firestoreService.getVisitNotes(),
        _firestoreService.getCombinedLeads(),
        _firestoreService.getAllAppointments(),
        _firestoreService.getUpsells(),
        _firestoreService.getAllUsers(),
        _firestoreService.getAllActivities(),
      ]);

      setState(() {
        _allVisitNotes = results[0] as List<VisitNote>;
        _allLeads = results[1] as List<Lead>;
        _allAppointments = results[2] as List<Appointment>;
        _allUpsells = results[3] as List<Upsell>;
        _allUsers = results[4] as List<UserProfile>;
        _allActivities = results[5] as List<Map<String, dynamic>>;
        
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading report: $e');
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading report: $e')));
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredVisitNotes = _allVisitNotes.where((note) {
        final repMatch = _selectedRep == 'All' || note.capturedBy == _selectedRep;
        final franchiseeMatch = _selectedFranchisee == 'All' || note.franchisee == _selectedFranchisee;
        final outcomeMatch = _selectedOutcome == 'All' || note.outcome['type']?.toString() == _selectedOutcome;
        
        bool dateMatch = true;
        if (_selectedDateRange != null) {
          dateMatch = note.createdAt.isAfter(_selectedDateRange!.start) &&
              note.createdAt.isBefore(_selectedDateRange!.end.add(const Duration(days: 1)));
        }
        return repMatch && franchiseeMatch && outcomeMatch && dateMatch;
      }).toList();
    });
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

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final stats = ReportStats(
      filteredNotes: _filteredVisitNotes,
      allLeads: _allLeads,
      allAppointments: _allAppointments,
      allUpsells: _allUpsells,
      allUsers: _allUsers,
      allActivities: _allActivities,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Activity Report'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        actions: [
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
            _buildFilterBar(),
            const SizedBox(height: 16),
            _buildStatsGrid(stats),
            const SizedBox(height: 24),
            _buildEfficiencySection(stats),
            const SizedBox(height: 24),
            _buildRepOutcomeEfficiencyTable(stats),
            const SizedBox(height: 24),
            _buildChartsSection(stats),
            const SizedBox(height: 24),
            _buildLeaderboards(stats),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Wrap(
        spacing: 16,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          _buildFilterDropdown('User', _selectedRep, _allUsers.map((u) => u.displayName ?? 'Unknown').toList(), (val) {
            setState(() { _selectedRep = val!; _applyFilters(); });
          }),
          _buildFilterDropdown('Franchisee', _selectedFranchisee, ['All'], (val) {
             setState(() { _selectedFranchisee = val!; _applyFilters(); });
          }),
          _buildFilterDropdown('Outcome', _selectedOutcome, ['All', 'Qualified - Set Appointment', 'Qualified - Generic Follow-up', 'Not Interested'], (val) {
             setState(() { _selectedOutcome = val!; _applyFilters(); });
          }),
          TextButton.icon(
            onPressed: _selectDateRange,
            icon: const Icon(Icons.calendar_month, size: 16, color: Color(0xFF095c7b)),
            label: Text(
              _selectedDateRange == null ? 'Period: Last 30 Days' : 'Period: ${DateFormat('MMM d').format(_selectedDateRange!.start)} - ${DateFormat('MMM d').format(_selectedDateRange!.end)}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF095c7b), fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterDropdown(String label, String value, List<String> options, ValueChanged<String?> onChanged) {
    final items = {'All', ...options.where((o) => o != 'All')}.toList();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$label: ', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
        DropdownButton<String>(
          value: value,
          isDense: true,
          underline: const SizedBox(),
          style: const TextStyle(fontSize: 12, color: Color(0xFF095c7b), fontWeight: FontWeight.bold),
          items: items.map((opt) => DropdownMenuItem(value: opt, child: Text(opt))).toList(),
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildStatsGrid(ReportStats stats) {
    final successRate = stats.totalVisits > 0 ? (stats.convertedCount / stats.totalVisits * 100) : 0.0;
    
    return Column(
      children: [
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: MediaQuery.of(context).size.width > 900 ? 4 : 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 2.2,
          children: [
            _buildStatCard('Total Visits', stats.totalVisits.toString(), Icons.directions_walk, Colors.blue, subtitle: 'Total volume'),
            _buildStatCard('Converted Leads', stats.convertedCount.toString(), Icons.check_circle, Colors.green, subtitle: 'CRM records'),
            _buildStatCard('Pending Processing', stats.pendingCount.toString(), Icons.timer, Colors.orange, subtitle: 'In queue'),
            _buildStatCard('Rejected Notes', stats.rejectedCount.toString(), Icons.cancel, Colors.red, subtitle: 'Invalid data'),
          ],
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: MediaQuery.of(context).size.width > 900 ? 4 : 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 2.2,
          children: [
            _buildStatCard('Follow-up Required', stats.followupNoteCount.toString(), Icons.repeat, Colors.purple, subtitle: 'Needs call'),
            _buildStatCard('Waitlist / Not Interested', stats.negativeNoteCount.toString(), Icons.hourglass_empty, Colors.brown, subtitle: 'No intent'),
            _buildStatCard('Appt Outcomes', stats.apptNoteCount.toString(), Icons.calendar_today, Colors.teal, subtitle: 'High intent'),
            _buildStatCard('Conversions (%)', '${successRate.toStringAsFixed(1)}%', Icons.trending_up, Colors.indigo, subtitle: 'Visit-to-Lead'),
          ],
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: MediaQuery.of(context).size.width > 900 ? 5 : 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: MediaQuery.of(context).size.width > 900 ? 2.0 : 1.4,
          children: [
            _buildStatCard('Appt Success', stats.leadsConvertedWithAppt.length.toString(), Icons.event_available, Colors.cyan, subtitle: 'Booked'),
            _buildStatCard('Upsell Success', stats.allUpsells.length.toString(), Icons.add_business, Colors.amber, subtitle: 'Existing'),
            _buildStatCard('Outbound Wins', '0', Icons.emoji_events, Colors.deepOrange, subtitle: 'From field'),
            _buildStatCard('Comm. Milestones', stats.commissionEligibleEvents.length.toString(), Icons.military_tech, Colors.blueGrey, subtitle: 'Eligible'),
            _buildStatCard('Total Comm.', '\$${stats.totalCommission.toStringAsFixed(0)}', Icons.payments, Colors.green, subtitle: 'Current period'),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color, {String? subtitle, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, color: color, size: 20),
                  ),
                  const Spacer(),
                  const Icon(Icons.help_outline, color: Colors.grey, size: 14),
                ],
              ),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    ),
                    Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[800], fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                    if (subtitle != null) Text(subtitle, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEfficiencySection(ReportStats stats) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _buildEfficiencyCard(
            'Sourced Lead Efficiency',
            'Conversion performance for visits in this period.',
            [
              _buildEfficiencyRow('Signed (Won)', stats.allLeads.where((l) => l.status == 'Won').length, stats.totalVisits, Colors.green),
              _buildEfficiencyRow('Qualified', stats.allLeads.where((l) => l.status == 'Qualified').length, stats.totalVisits, Colors.blue),
              _buildEfficiencyRow('Quote Sent', stats.allLeads.where((l) => l.status == 'Quote Sent').length, stats.totalVisits, Colors.orange),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildEfficiencyCard(
            'Appointment Funnel Efficiency',
            'Processing status for high-intent appointment visits.',
            [
              _buildEfficiencyRow('Converted to CRM', stats.apptConvertedLeads.length, stats.apptVisits.length, Colors.indigo),
              _buildEfficiencyRow('Linked to Existing', 0, stats.apptVisits.length, Colors.teal),
              _buildEfficiencyRow('Pending Conversion', stats.pendingApptConversionVisits.length, stats.apptVisits.length, Colors.amber),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEfficiencyCard(String title, String subtitle, List<Widget> children) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildEfficiencyRow(String label, int count, int total, Color color) {
    final percent = total > 0 ? (count / total * 100) : 0.0;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
              Text('$count (${percent.toStringAsFixed(1)}%)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: total > 0 ? count / total : 0,
              backgroundColor: color.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRepOutcomeEfficiencyTable(ReportStats stats) {
    final repStats = stats.repStats;
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             const Text('Rep Outcome Efficiency', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
             Text('Breakdown of visit outcomes by field representative.', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
             const SizedBox(height: 16),
             Table(
               columnWidths: const {
                 0: FlexColumnWidth(2),
                 1: FlexColumnWidth(1),
                 2: FlexColumnWidth(3),
               },
               defaultVerticalAlignment: TableCellVerticalAlignment.middle,
               children: [
                 const TableRow(
                   children: [
                     Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('REPRESENTATIVE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey))),
                     Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('VISITS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey))),
                     Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('OUTCOME DISTRIBUTION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey))),
                   ]
                 ),
                 ...repStats.map((rep) {
                   final outcomes = rep['outcomes'] as Map<String, int>;
                   final total = rep['visits'] as int;
                   return TableRow(
                     decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey[200]!))),
                     children: [
                       Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(rep['name'], style: const TextStyle(fontWeight: FontWeight.w600))),
                       Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(total.toString())),
                       Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: _buildStackedBar(outcomes, total)),
                     ]
                   );
                 }),
               ],
             ),
          ],
        ),
      ),
    );
  }

  Widget _buildStackedBar(Map<String, int> outcomes, int total) {
    if (total == 0) return const SizedBox();
    final segments = <Widget>[];
    final sortedOutcomeTypes = outcomes.keys.toList()..sort();
    for (var i = 0; i < sortedOutcomeTypes.length; i++) {
      final type = sortedOutcomeTypes[i];
      final count = outcomes[type]!;
      if (count == 0) continue;
      segments.add(
        Expanded(
          flex: count,
          child: Container(
            height: 20,
            color: Colors.primaries[i % Colors.primaries.length],
            child: count / total > 0.1 ? Center(child: Text(count.toString(), style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold))) : null,
          ),
        ),
      );
    }
    return ClipRRect(borderRadius: BorderRadius.circular(4), child: Row(children: segments));
  }

  Widget _buildChartsSection(ReportStats stats) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildChartCard('Appointment Outcomes', _buildApptOutcomeChart(stats))),
            const SizedBox(width: 16),
            Expanded(child: _buildChartCard('Lead Status', _buildConvertedStatusChart(stats))),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildChartCard('Total Visits by Rep', _buildVisitsByRepChart(stats))),
            const SizedBox(width: 16),
            Expanded(child: _buildChartCard('All Outcomes', _buildApptOutcomeChart(stats))),
          ],
        ),
      ],
    );
  }

  Widget _buildChartCard(String title, Widget chart) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            SizedBox(height: 300, child: chart),
          ],
        ),
      ),
    );
  }

  Widget _buildApptOutcomeChart(ReportStats stats) {
    final distribution = stats.outcomeDistribution;
    final sections = distribution.entries.map((e) {
      final index = distribution.keys.toList().indexOf(e.key);
      return PieChartSectionData(
        value: e.value.toDouble(),
        title: '${e.value}',
        radius: 60,
        color: Colors.primaries[index % Colors.primaries.length],
        titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
      );
    }).toList();
    return PieChart(PieChartData(sections: sections, centerSpaceRadius: 40));
  }

  Widget _buildConvertedStatusChart(ReportStats stats) {
    final statusCounts = <String, int>{};
    for (var lead in stats.allLeads) {
      statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1;
    }
    final sections = statusCounts.entries.map((e) {
      final index = statusCounts.keys.toList().indexOf(e.key);
      return PieChartSectionData(
        value: e.value.toDouble(),
        title: '${e.value}',
        radius: 60,
        color: Colors.primaries[(index + 5) % Colors.primaries.length],
        titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
      );
    }).toList();
    return PieChart(PieChartData(sections: sections, centerSpaceRadius: 0));
  }

  Widget _buildVisitsByRepChart(ReportStats stats) {
    final repStats = stats.repStats.take(10).toList();
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: repStats.isEmpty ? 10 : repStats.first['visits'].toDouble() * 1.2,
        barGroups: repStats.asMap().entries.map((e) {
          return BarChartGroupData(
            x: e.key,
            barRods: [
              BarChartRodData(
                toY: e.value['visits'].toDouble(),
                color: const Color(0xFF095c7b),
                width: 16,
                borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(4)),
              ),
            ],
          );
        }).toList(),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.toInt() < 0 || value.toInt() >= repStats.length) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(repStats[value.toInt()]['name'].split(' ').last, style: const TextStyle(fontSize: 10)),
                );
              },
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
      ),
    );
  }

  Widget _buildLeaderboards(ReportStats stats) {
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildLeaderboardCard('Appointment Success', stats.leadsConvertedWithAppt.map((l) => {'name': l.companyName, 'value': l.status}).toList())),
            const SizedBox(width: 16),
            Expanded(child: _buildLeaderboardCard('Upsell Success', stats.allUpsells.map((u) => {'name': u.companyName, 'value': '\$${u.amount?.toStringAsFixed(0) ?? '0'}'}).toList())),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildLeaderboardCard('Outbound Wins', [])),
            const SizedBox(width: 16),
            Expanded(child: _buildLeaderboardCard('Commission Earnings', stats.repStats.map((r) => {'name': r['name'] as String, 'value': '\$${(r['commission'] as double).toStringAsFixed(0)}'}).toList())),
          ],
        ),
      ],
    );
  }

  Widget _buildLeaderboardCard(String title, List<Map<String, String>> items) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(child: Text('No success records found.', style: TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic))),
              )
            else
              ...items.take(5).map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Expanded(child: Text(item['name']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                      child: Text(item['value']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue)),
                    ),
                  ],
                ),
              )),
          ],
        ),
      ),
    );
  }
}
