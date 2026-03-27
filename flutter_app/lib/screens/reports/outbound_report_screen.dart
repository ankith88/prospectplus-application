import 'package:flutter/material.dart';
import '../../services/firestore_service.dart';
import '../../models/lead.dart';
import '../../models/appointment.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../widgets/layout/main_layout.dart';

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
  List<Map<String, dynamic>> _allVisitNotes = [];

  // Filtered lists
  List<Lead> _filteredLeads = [];
  List<Map<String, dynamic>> _filteredActivities = [];
  List<Appointment> _filteredAppointments = [];

  // Filter state
  DateTimeRange? _activityDateRange;
  DateTimeRange? _appointmentDateRange;
  final List<String> _selectedDialers = [];
  final List<String> _selectedAMs = [];
  final List<String> _selectedFranchisees = [];
  final List<String> _selectedStatuses = [];
  String _sourceFilter = 'all'; // all, yes, no (Field Sourced)
  
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
        _firestoreService.getVisitNotesRaw(), // Need a raw version for visit notes
        _firestoreService.getAllUsersRaw(),   // Need a raw version for user names
      ]);

      setState(() {
        _allLeads = results[0] as List<Lead>;
        _allActivities = (results[1] as List<Map<String, dynamic>>).where((a) => a['type'] == 'Call').toList();
        _allAppointments = results[2] as List<Appointment>;
        _allVisitNotes = (results[3] as List<Map<String, dynamic>>);
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
        final leadId = activity['leadId'] as String?;
        final lead = _allLeads.firstWhere((l) => l.id == leadId, orElse: () => Lead(id: '', companyName: 'Unknown', status: 'New', profile: ''));
        
        bool dialerMatch = _selectedDialers.isEmpty || (lead.dialerAssigned != null && _selectedDialers.contains(lead.dialerAssigned));
        bool franchiseeMatch = _selectedFranchisees.isEmpty || (lead.franchisee != null && _selectedFranchisees.contains(lead.franchisee));
        bool statusMatch = _selectedStatuses.isEmpty || _selectedStatuses.contains(lead.status);
        bool sourceMatch = true;
        if (_sourceFilter == 'yes') sourceMatch = lead.visitNoteID != null && lead.visitNoteID!.isNotEmpty;
        if (_sourceFilter == 'no') sourceMatch = lead.visitNoteID == null || lead.visitNoteID!.isEmpty;

        bool dateMatch = true;
        if (_activityDateRange != null) {
          final dateStr = activity['date'] as String?;
          if (dateStr == null) return false;
          final date = DateTime.tryParse(dateStr);
          if (date == null) return false;
          dateMatch = date.isAfter(_activityDateRange!.start.subtract(const Duration(seconds: 1))) && 
                     date.isBefore(_activityDateRange!.end.add(const Duration(days: 1)));
        }
        
        return dialerMatch && franchiseeMatch && statusMatch && sourceMatch && dateMatch;
      }).toList();

      _filteredAppointments = _allAppointments.where((appt) {
        final lead = _allLeads.firstWhere((l) => l.id == appt.leadId, orElse: () => Lead(id: '', companyName: 'Unknown', status: 'New', profile: ''));
        
        bool dialerMatch = _selectedDialers.isEmpty || (lead.dialerAssigned != null && _selectedDialers.contains(lead.dialerAssigned));
        bool amMatch = _selectedAMs.isEmpty || _selectedAMs.contains(appt.assignedTo);
        bool franchiseeMatch = _selectedFranchisees.isEmpty || (lead.franchisee != null && _selectedFranchisees.contains(lead.franchisee));
        bool statusMatch = _selectedStatuses.isEmpty || _selectedStatuses.contains(lead.status);
        bool sourceMatch = true;
        if (_sourceFilter == 'yes') sourceMatch = lead.visitNoteID?.isNotEmpty ?? false;
        if (_sourceFilter == 'no') sourceMatch = lead.visitNoteID == null || lead.visitNoteID!.isEmpty;

        bool creationDateMatch = true;
        if (_activityDateRange != null) {
          final createdDate = DateTime.tryParse(appt.duedate);
          if (createdDate == null) return false;
          creationDateMatch = createdDate.isAfter(_activityDateRange!.start.subtract(const Duration(seconds: 1))) &&
                             createdDate.isBefore(_activityDateRange!.end.add(const Duration(days: 1)));
        }

        bool apptDateMatch = true;
        if (_appointmentDateRange != null) {
          final apptDate = DateTime.tryParse(appt.duedate);
          if (apptDate == null) return false;
          apptDateMatch = apptDate.isAfter(_appointmentDateRange!.start.subtract(const Duration(seconds: 1))) &&
                          apptDate.isBefore(_appointmentDateRange!.end.add(const Duration(days: 1)));
        }

        return dialerMatch && amMatch && franchiseeMatch && statusMatch && sourceMatch && creationDateMatch && apptDateMatch;
      }).toList();

      _filteredLeads = _allLeads.where((l) {
        bool dialerMatch = _selectedDialers.isEmpty || (l.dialerAssigned != null && _selectedDialers.contains(l.dialerAssigned));
        bool franchiseeMatch = _selectedFranchisees.isEmpty || (l.franchisee != null && _selectedFranchisees.contains(l.franchisee));
        bool statusMatch = _selectedStatuses.isEmpty || _selectedStatuses.contains(l.status);
        bool sourceMatch = true;
        if (_sourceFilter == 'yes') sourceMatch = l.visitNoteID != null && l.visitNoteID!.isNotEmpty;
        if (_sourceFilter == 'no') sourceMatch = l.visitNoteID == null || l.visitNoteID!.isEmpty;
        return dialerMatch && franchiseeMatch && statusMatch && sourceMatch;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      title: 'Outbound Reporting',
      currentRoute: '/reports',
      showHeader: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Outbound Reporting'),
          backgroundColor: const Color(0xFF095c7b),
          foregroundColor: Colors.white,
          leading: Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadData,
            ),
          ],
        ),
        drawer: _buildFilterDrawer(),
        backgroundColor: const Color(0xFFf0f4f8),
        body: _isLoading 
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStatGrid(_calculateStats()),
                    const SizedBox(height: 24),
                    _buildChartSection('Appointment Outcomes', _buildAppointmentOutcomeChart()),
                    const SizedBox(height: 24),
                    _buildChartSection('Call Outcomes', _buildCallOutcomeChart()),
                    const SizedBox(height: 24),
                    _buildChartSection('Team Performance', _buildTeamPerformanceChart()),
                    const SizedBox(height: 24),
                    _buildFieldRepContributionTable(),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildFieldRepContributionTable() {
    // Logic from web: stats.fieldRepContribution
    final visitNotesMap = { for (var n in _allVisitNotes) n['id']: n };
    final sourcingMap = <String, Map<String, dynamic>>{};

    final fieldSourcedLeads = _allLeads.where((l) => l.visitNoteID != null && l.visitNoteID!.isNotEmpty && l.fieldSales == false);

    for (var lead in fieldSourcedLeads) {
      final note = visitNotesMap[lead.visitNoteID];
      if (note == null) continue;
      final rep = note['capturedBy'] as String? ?? 'Unknown Rep';
      
      if (!sourcingMap.containsKey(rep)) {
        sourcingMap[rep] = { 'name': rep, 'total': 0, 'appts': 0, 'wins': 0 };
      }
      
      sourcingMap[rep]!['total']++;
      if (lead.status == 'Won') sourcingMap[rep]!['wins']++;
      
      final hasAppt = _allAppointments.any((a) => a.leadId == lead.id);
      if (hasAppt) sourcingMap[rep]!['appts']++;
    }

    final sortedContribution = sourcingMap.values.toList()..sort((a, b) => b['total'].compareTo(a['total']));

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Field Rep Contribution', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 20,
                columns: const [
                  DataColumn(label: Text('Field Rep')),
                  DataColumn(label: Text('Total Leads'), numeric: true),
                  DataColumn(label: Text('Appts'), numeric: true),
                  DataColumn(label: Text('Wins'), numeric: true),
                ],
                rows: sortedContribution.map((contribution) {
                  return DataRow(cells: [
                    DataCell(Text(contribution['name'])),
                    DataCell(Text(contribution['total'].toString())),
                    DataCell(Text(contribution['appts'].toString())),
                    DataCell(Text(contribution['wins'].toString())),
                  ]);
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterDrawer() {
    final dialers = _allLeads.map((l) => l.dialerAssigned).whereType<String>().toSet().toList()..sort();
    final ams = _allAppointments.map((a) => a.assignedTo).whereType<String>().toSet().toList()..sort();
    final franchisees = _allLeads.map((l) => l.franchisee).whereType<String>().toSet().toList()..sort();
    final statuses = [
      'New', 'Priority Lead', 'Contacted', 'Qualified', 'Unqualified', 
      'Lost', 'Won', 'In Progress', 'Quote Sent', 'Trialing ShipMate'
    ];

    return Drawer(
      child: Column(
        children: [
          AppBar(
            title: const Text('Filters'),
            automaticallyImplyLeading: false,
            backgroundColor: const Color(0xFF095c7b),
            foregroundColor: Colors.white,
            actions: [
              TextButton(
                onPressed: () {
                  setState(() {
                    _selectedDialers.clear();
                    _selectedAMs.clear();
                    _selectedFranchisees.clear();
                    _selectedStatuses.clear();
                    _activityDateRange = null;
                    _appointmentDateRange = null;
                    _sourceFilter = 'all';
                    _applyFilters();
                  });
                },
                child: const Text('Reset', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildDateRangeSelector('Activity Date', _activityDateRange, (range) {
                  setState(() { _activityDateRange = range; _applyFilters(); });
                }),
                const Divider(),
                _buildDateRangeSelector('Appointment Date', _appointmentDateRange, (range) {
                  setState(() { _appointmentDateRange = range; _applyFilters(); });
                }),
                const Divider(),
                _buildFilterSection('Dialer Assigned', dialers, _selectedDialers),
                const Divider(),
                _buildFilterSection('AM Assigned', ams, _selectedAMs),
                const Divider(),
                _buildFilterSection('Franchisee', franchisees, _selectedFranchisees),
                const Divider(),
                _buildFilterSection('Status', statuses, _selectedStatuses),
                const Divider(),
                const Text('Source', style: TextStyle(fontWeight: FontWeight.bold)),
                RadioListTile<String>(
                  title: const Text('All Sources'),
                  value: 'all',
                  groupValue: _sourceFilter,
                  onChanged: (v) { setState(() { _sourceFilter = v!; _applyFilters(); }); },
                ),
                RadioListTile<String>(
                  title: const Text('Field Sourced Only'),
                  value: 'yes',
                  groupValue: _sourceFilter,
                  onChanged: (v) { setState(() { _sourceFilter = v!; _applyFilters(); }); },
                ),
                RadioListTile<String>(
                  title: const Text('Outbound Only'),
                  value: 'no',
                  groupValue: _sourceFilter,
                  onChanged: (v) { setState(() { _sourceFilter = v!; _applyFilters(); }); },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateRangeSelector(String title, DateTimeRange? range, Function(DateTimeRange?) onSelect) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final picked = await showDateRangePicker(
              context: context,
              firstDate: DateTime(2023),
              lastDate: DateTime.now().add(const Duration(days: 365)),
              initialDateRange: range,
            );
            if (picked != null) onSelect(picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, size: 16),
                const SizedBox(width: 8),
                Text(range == null ? 'Select Date Range' : '${range.start.toLocal().toString().split(' ')[0]} - ${range.end.toLocal().toString().split(' ')[0]}'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterSection(String title, List<String> options, List<String> selections) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: options.map((opt) {
            final isSelected = selections.contains(opt);
            return FilterChip(
              label: Text(opt, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : Colors.black)),
              selected: isSelected,
              selectedColor: const Color(0xFF095c7b),
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    selections.add(opt);
                  } else {
                    selections.remove(opt);
                  }
                  _applyFilters();
                });
              },
            );
          }).toList(),
        ),
      ],
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

}
