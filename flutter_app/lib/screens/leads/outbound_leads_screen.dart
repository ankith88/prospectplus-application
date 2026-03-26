import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/lead.dart';
import '../../models/user_profile.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import 'lead_detail_screen.dart';
import '../../widgets/layout/main_layout.dart';
import '../../theme/app_theme.dart';

class OutboundLeadsScreen extends StatefulWidget {
  const OutboundLeadsScreen({super.key});

  @override
  State<OutboundLeadsScreen> createState() => _OutboundLeadsScreenState();
}

class _OutboundLeadsScreenState extends State<OutboundLeadsScreen> {
  final _firestoreService = FirestoreService();
  bool _isLoading = true;
  bool _showFilters = false;
  String _searchQuery = '';
  
  List<Lead> _allLeads = [];
  List<UserProfile> _allUsers = [];
  UserProfile? _currentUserProfile;
  
  final Set<String> _selectedLeadIds = {};
  final Set<String> _expandedLeadIds = {};
  final Map<String, List<Map<String, dynamic>>> _leadHistories = {};
  final Map<String, bool> _historyLoading = {};

  // Advanced Filters
  String _entityIdFilter = '';
  String _suburbFilter = '';
  List<String> _statusFilters = [];
  List<String> _franchiseeFilters = [];
  String _campaignFilter = 'all';
  List<String> _sourceFilters = [];
  DateTimeRange? _dateFilter;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _toggleLeadExpansion(String id) async {
    setState(() {
      if (_expandedLeadIds.contains(id)) {
        _expandedLeadIds.remove(id);
      } else {
        _expandedLeadIds.add(id);
      }
    });

    if (_expandedLeadIds.contains(id) && !_leadHistories.containsKey(id)) {
      setState(() => _historyLoading[id] = true);
      try {
        final activities = await _firestoreService.getActivities(id).first;
        if (mounted) {
          setState(() {
            _leadHistories[id] = activities;
            _historyLoading[id] = false;
          });
        }
      } catch (e) {
        debugPrint('Error fetching history: $e');
        if (mounted) setState(() => _historyLoading[id] = false);
      }
    }
  }

  Future<void> _handleBulkAssign() async {
    if (_selectedLeadIds.isEmpty) return;
    final myName = _currentUserProfile?.displayName ?? 'Me';
    setState(() => _isLoading = true);
    try {
      await _firestoreService.bulkUpdateLeads(
        _selectedLeadIds.toList(), 
        {'dialerAssigned': myName, 'salesRepAssigned': myName}
      );
      _selectedLeadIds.clear();
      await _loadData();
    } catch (e) {
      debugPrint('Error bulk assigning: $e');
    }
    setState(() => _isLoading = false);
  }

  Future<void> _handleBulkUnassign() async {
    if (_selectedLeadIds.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      await _firestoreService.bulkUpdateLeads(
        _selectedLeadIds.toList(), 
        {'dialerAssigned': null, 'salesRepAssigned': null}
      );
      _selectedLeadIds.clear();
      await _loadData();
    } catch (e) {
      debugPrint('Error bulk unassigning: $e');
    }
    setState(() => _isLoading = false);
  }

  Future<void> _handleBulkDelete() async {
    if (_selectedLeadIds.isEmpty) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text('Delete ${_selectedLeadIds.length} leads? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      try {
        await _firestoreService.bulkDeleteLeads(_selectedLeadIds.toList());
        _selectedLeadIds.clear();
        await _loadData();
      } catch (e) {
        debugPrint('Error bulk deleting: $e');
      }
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleBulkMoveToField() async {
    if (_selectedLeadIds.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      await _firestoreService.bulkUpdateLeads(
        _selectedLeadIds.toList(), 
        {'fieldSales': true}
      );
      _selectedLeadIds.clear();
      await _loadData();
    } catch (e) {
      debugPrint('Error bulk moving: $e');
    }
    setState(() => _isLoading = false);
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      final results = await Future.wait([
        _firestoreService.getCombinedLeads(),
        _firestoreService.getAllUsers(),
        if (user != null) AuthService().getUserProfile(user.uid) else Future.value(null),
      ]);
      
      if (mounted) {
        setState(() {
          _allLeads = results[0] as List<Lead>;
          _allUsers = results[1] as List<UserProfile>;
          _currentUserProfile = results[2] as UserProfile?;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading outbound leads: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _toggleLeadSelection(String id) {
    setState(() {
      if (_selectedLeadIds.contains(id)) {
        _selectedLeadIds.remove(id);
      } else {
        _selectedLeadIds.add(id);
      }
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedLeadIds.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final filteredLeads = _allLeads.where((l) {
      // 1. Status Exclusion (Archived Bucket)
      final archivedStatuses = [
        'Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 
        'Trialing ShipMate', 'Won', 'LocalMile Pending', 'Free Trial', 
        'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 
        'In Qualification', 'Quote Sent'
      ];
      if (archivedStatuses.contains(l.status)) return false;

      // 2. Field Sales Lead Exclusion
      final isFieldSalesLead = l.fieldSales == true && l.status != 'Priority Field Lead';
      if (isFieldSalesLead) return false;

      // 3. Search Query (Company Name or Contact Name)
      final searchQueryLow = _searchQuery.toLowerCase();
      final nameMatch = l.companyName.toLowerCase().contains(searchQueryLow);
      final contactMatch = l.contacts?.any((c) => (c['name'] ?? '').toLowerCase().contains(searchQueryLow)) ?? false;
      if (_searchQuery.isNotEmpty && !nameMatch && !contactMatch) return false;

      // 4. Advanced Filters
      if (_entityIdFilter.isNotEmpty && !(l.entityId?.contains(_entityIdFilter) ?? false)) return false;
      if (_suburbFilter.isNotEmpty && !((l.address?['suburb'] ?? '').toString().toLowerCase().contains(_suburbFilter.toLowerCase()))) return false;
      if (_statusFilters.isNotEmpty && !_statusFilters.contains(l.status)) return false;
      if (_franchiseeFilters.isNotEmpty && !_franchiseeFilters.contains(l.franchisee)) return false;
      
      if (_campaignFilter != 'all') {
        if (_campaignFilter == 'D2D' && l.customerSource != 'D2D') return false;
      }
      
      if (_sourceFilters.isNotEmpty && !_sourceFilters.contains(l.customerSource)) return false;
      
      if (_dateFilter != null) {
        final leadDate = l.dateLeadEntered != null ? (l.dateLeadEntered is DateTime ? l.dateLeadEntered : DateTime.tryParse(l.dateLeadEntered.toString())) : null;
        if (leadDate == null) return false;
        if (leadDate.isBefore(_dateFilter!.start) || leadDate.isAfter(_dateFilter!.end.add(const Duration(days: 1)))) return false;
      }

      return true;
    }).toList();

    final myLeads = filteredLeads.where((l) {
      final myName = _currentUserProfile?.displayName ?? 'Me';
      return l.salesRepAssigned == myName || l.dialerAssigned == myName;
    }).toList();

    final Map<String, List<Lead>> groupedMyLeads = {};
    for (var lead in myLeads) {
      groupedMyLeads[lead.status] = (groupedMyLeads[lead.status] ?? [])..add(lead);
    }
    final sortedMyStatuses = groupedMyLeads.keys.toList()..sort();
    
    final assignedLeads = filteredLeads.where((l) => (l.salesRepAssigned != null && l.salesRepAssigned != 'None' && l.salesRepAssigned != '') || (l.dialerAssigned != null && l.dialerAssigned != 'None' && l.dialerAssigned != '')).toList();
    final unassignedLeads = filteredLeads.where((l) => (l.salesRepAssigned == null || l.salesRepAssigned == 'None' || l.salesRepAssigned == '') && (l.dialerAssigned == null || l.dialerAssigned == 'None' || l.dialerAssigned == '')).toList();

    // Grouping: Dialer -> Status -> Leads
    final Map<String, Map<String, List<Lead>>> groupedAssignedLeads = {};
    for (var lead in assignedLeads) {
      String rep = 'Unknown';
      if (lead.dialerAssigned != null && lead.dialerAssigned!.isNotEmpty && lead.dialerAssigned != 'None') {
        rep = lead.dialerAssigned!;
      } else if (lead.salesRepAssigned != null && lead.salesRepAssigned!.isNotEmpty && lead.salesRepAssigned != 'None') {
        rep = lead.salesRepAssigned!;
      }
      final status = lead.status;
      
      if (!groupedAssignedLeads.containsKey(rep)) {
        groupedAssignedLeads[rep] = {};
      }
      if (!groupedAssignedLeads[rep]!.containsKey(status)) {
        groupedAssignedLeads[rep]![status] = [];
      }
      groupedAssignedLeads[rep]![status]!.add(lead);
    }

    final sortedReps = groupedAssignedLeads.keys.toList()..sort((a, b) {
      final aExists = _allUsers.any((u) => u.displayName == a || u.firstName == a);
      final bExists = _allUsers.any((u) => u.displayName == b || u.firstName == b);
      if (aExists && !bExists) return -1;
      if (!aExists && bExists) return 1;
      return a.compareTo(b);
    });

    return MainLayout(
      title: 'Outbound Leads',
      currentRoute: '/leads',
      child: Stack(
        children: [
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildActionHeader(),
                const SizedBox(height: 24),
                _buildFilterBar(),
                if (_showFilters) _buildAdvancedFilters(),
                const SizedBox(height: 24),
                _buildSectionHeader('My Assigned Leads', badge: '${myLeads.length}', trailing: _buildMyLeadsActions()),
                _buildMyLeadsExpanse(groupedMyLeads, sortedMyStatuses),
                const SizedBox(height: 32),
                _buildSectionHeader(
                  'All Assigned Leads', 
                  badge: '${assignedLeads.length}',
                  trailing: _buildActionButton('Export All Assigned', Icons.download),
                ),
                _buildAssignedLeadsExpanse(groupedAssignedLeads, sortedReps),
                const SizedBox(height: 32),
                _buildSectionHeader(
                  'All Unassigned Leads', 
                  badge: '${unassignedLeads.length}',
                ),
                _buildLeadsTable(unassignedLeads),
                const SizedBox(height: 100), // Padding for the bulk action bar
              ],
            ),
          ),
          if (_selectedLeadIds.isNotEmpty)
            Positioned(
              bottom: 0,
              left: 40,
              right: 40,
              child: _buildBulkActionOverlay(),
            ),
        ],
      ),
    );
  }

  Widget _buildActionHeader() {
    return Row(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Outbound Leads',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Manage and engage with your leads efficiently.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        const Spacer(),
        ElevatedButton.icon(
          onPressed: () => Navigator.pushNamed(context, '/leads/new'),
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Add Lead'),
        ),
      ],
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.search, color: Colors.grey, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              decoration: const InputDecoration(
                hintText: 'Search by company or contact...',
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          const VerticalDivider(width: 32),
          _buildIconButton(Icons.refresh, _loadData, tooltip: 'Refresh Data'),
          const SizedBox(width: 8),
          _buildIconButton(Icons.tune, () => setState(() => _showFilters = !_showFilters), tooltip: 'Advanced Filters'),
        ],
      ),
    );
  }

  Widget _buildAdvancedFilters() {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Advanced Filters', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              return Column(
                children: [
                   Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: _buildFilterField(
                          'Customer ID', 
                          TextField(
                            onChanged: (v) => setState(() => _entityIdFilter = v),
                            decoration: const InputDecoration(hintText: 'e.g. 1001', isDense: true),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildFilterField(
                          'Suburb', 
                          TextField(
                            onChanged: (v) => setState(() => _suburbFilter = v),
                            decoration: const InputDecoration(hintText: 'e.g. Sydney', isDense: true),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildFilterField(
                    'Status', 
                    _buildMultiSelectChipGroup(
                      ['New', 'Contacted', 'In Progress', 'Connected', 'Priority Lead', 'Trialing ShipMate'],
                      _statusFilters,
                      (selected) => setState(() => _statusFilters = selected),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildFilterField(
                    'Franchisee', 
                    _buildMultiSelectChipGroup(
                      _allLeads.map((l) => l.franchisee).whereType<String>().toSet().toList()..sort(),
                      _franchiseeFilters,
                      (selected) => setState(() => _franchiseeFilters = selected),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _buildFilterField(
                          'Campaign', 
                          DropdownButtonFormField<String>(
                            value: _campaignFilter,
                            items: const [
                              DropdownMenuItem(value: 'all', child: Text('All Campaigns')),
                              DropdownMenuItem(value: 'D2D', child: Text('D2D')),
                            ],
                            onChanged: (v) => setState(() => _campaignFilter = v ?? 'all'),
                            decoration: const InputDecoration(isDense: true),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildFilterField(
                          'Date Entered', 
                          OutlinedButton.icon(
                            onPressed: () async {
                              final picked = await showDateRangePicker(
                                context: context, 
                                firstDate: DateTime(2020), 
                                lastDate: DateTime.now(),
                                initialDateRange: _dateFilter,
                              );
                              if (picked != null) setState(() => _dateFilter = picked);
                            },
                            icon: const Icon(Icons.calendar_today, size: 16),
                            label: Text(_dateFilter == null ? 'Any Date' : '${_dateFilter!.start.day}/${_dateFilter!.start.month} - ${_dateFilter!.end.day}/${_dateFilter!.end.month}'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: _clearFilters,
              icon: const Icon(Icons.filter_list_off, size: 18),
              label: const Text('Clear Filters'),
              style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterField(String label, Widget child) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[600])),
        const SizedBox(height: 8),
        child,
      ],
    );
  }

  Widget _buildMultiSelectChipGroup(List<String> options, List<String> selected, Function(List<String>) onSelected) {
    if (options.isEmpty) return const Text('No options available', style: TextStyle(color: Colors.grey, fontSize: 12));
    return Wrap(
      spacing: 8,
      runSpacing: 4,
      children: options.map((option) {
        final isSelected = selected.contains(option);
        return FilterChip(
          label: Text(option, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : AppTheme.foreground)),
          selected: isSelected,
          onSelected: (val) {
            final newList = List<String>.from(selected);
            if (val) {
              newList.add(option);
            } else {
              newList.remove(option);
            }
            onSelected(newList);
          },
          selectedColor: AppTheme.primary,
          checkmarkColor: Colors.white,
          backgroundColor: Colors.grey[100],
          padding: const EdgeInsets.symmetric(horizontal: 4),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        );
      }).toList(),
    );
  }

  void _clearFilters() {
    setState(() {
      _searchQuery = '';
      _entityIdFilter = '';
      _suburbFilter = '';
      _statusFilters = [];
      _franchiseeFilters = [];
      _campaignFilter = 'all';
      _sourceFilters = [];
      _dateFilter = null;
    });
  }

  Widget _buildIconButton(IconData icon, VoidCallback onPressed, {String? tooltip}) {
    return IconButton(
      onPressed: onPressed,
      icon: Icon(icon, size: 20, color: Colors.blueGrey[600]),
      tooltip: tooltip,
      style: IconButton.styleFrom(
        padding: const EdgeInsets.all(8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: BorderSide(color: Colors.grey.withOpacity(0.1)),
      ),
    );
  }

  Widget _buildSectionHeader(String title, {String? badge, Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.foreground),
          ),
          if (badge != null) ...[
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                badge, 
                style: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.bold)
              ),
            ),
          ],
          const Spacer(),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _buildMyLeadsActions() {
    return Row(
      children: [
        _buildActionButton('Export My Leads', Icons.download),
        const SizedBox(width: 12),
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.file_upload_outlined, size: 16),
          label: const Text('Move Selected'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.accent,
            foregroundColor: AppTheme.foreground,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(String label, IconData icon) {
    return OutlinedButton.icon(
      onPressed: () {},
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
        foregroundColor: AppTheme.foreground,
      ),
    );
  }

  Widget _buildLeadsTable(List<Lead> leads) {
    if (leads.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.withOpacity(0.1)),
        ),
        child: const Column(
          children: [
            Icon(Icons.inbox_outlined, size: 48, color: Colors.grey),
            SizedBox(height: 16),
            Text('No leads found matching your criteria.', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: leads.length,
          separatorBuilder: (context, index) => Divider(height: 1, color: Colors.grey[100]),
          itemBuilder: (context, index) {
            final lead = leads[index];
            final bool isSelected = _selectedLeadIds.contains(lead.id);
            final bool isExpanded = _expandedLeadIds.contains(lead.id);

            return Column(
              children: [
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  leading: Checkbox(
                    value: isSelected,
                    onChanged: (_) => _toggleLeadSelection(lead.id),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  title: Text(
                    lead.companyName, 
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.foreground)
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        _buildStatusBadge(lead.status),
                        const SizedBox(width: 12),
                        Icon(Icons.person_outline, size: 14, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Text(
                          (lead.contacts != null && lead.contacts!.isNotEmpty) 
                              ? lead.contacts![0]['name'] ?? 'No Contact' 
                              : 'No Contact', 
                          style: TextStyle(fontSize: 13, color: Colors.grey[600])
                        ),
                      ],
                    ),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(isExpanded ? Icons.history : Icons.history_outlined, 
                          color: isExpanded ? AppTheme.primary : Colors.grey, size: 20),
                        onPressed: () => _toggleLeadExpansion(lead.id),
                        tooltip: 'View History',
                      ),
                      const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
                ),
                if (isExpanded) _buildLeadHistoryDetails(lead.id),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildLeadHistoryDetails(String leadId) {
    if (_historyLoading[leadId] == true) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }

    final history = _leadHistories[leadId] ?? [];
    if (history.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Text('No recent activity found.', style: TextStyle(color: Colors.grey, fontSize: 13)),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: Colors.grey[50],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recent Activity', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[700])),
          const SizedBox(height: 12),
          ...history.take(3).map((activity) => Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.circle, size: 6, color: AppTheme.primary.withOpacity(0.5)),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(activity['notes'] ?? activity['content'] ?? 'No detail', style: const TextStyle(fontSize: 13)),
                      Text(activity['date'] != null ? activity['date'].toString().split('T')[0] : 'N/A', 
                        style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                    ],
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildMyLeadsExpanse(Map<String, List<Lead>> groupedLeads, List<String> sortedStatuses) {
    if (groupedLeads.isEmpty) {
      return Container(
        height: 100,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.withOpacity(0.1)),
        ),
        child: const Center(child: Text('No leads assigned to you.', style: TextStyle(color: Colors.grey))),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: sortedStatuses.length,
        separatorBuilder: (context, index) => Divider(height: 1, color: Colors.grey[100]),
        itemBuilder: (context, index) {
          final status = sortedStatuses[index];
          final leads = groupedLeads[status]!;
          
          return ExpansionTile(
            initiallyExpanded: status == 'New',
            tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            title: Row(
              children: [
                _buildStatusBadge(status),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('${leads.length} leads', style: TextStyle(color: Colors.grey[600], fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            children: leads.map((lead) {
               final bool isSelected = _selectedLeadIds.contains(lead.id);
               final bool isExpanded = _expandedLeadIds.contains(lead.id);
               return Container(
                 color: isSelected ? AppTheme.primary.withOpacity(0.02) : Colors.transparent,
                 child: Column(
                   children: [
                     ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      leading: Checkbox(
                        value: isSelected,
                        onChanged: (_) => _toggleLeadSelection(lead.id),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                      title: Text(lead.companyName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.foreground)),
                      subtitle: Text(lead.address?['suburb'] ?? '', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(isExpanded ? Icons.history : Icons.history_outlined, 
                              color: isExpanded ? AppTheme.primary : Colors.grey, size: 18),
                            onPressed: () => _toggleLeadExpansion(lead.id),
                            tooltip: 'View History',
                          ),
                          const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                        ],
                      ),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
                    ),
                    if (isExpanded) _buildLeadHistoryDetails(lead.id),
                   ],
                 ),
               );
            }).toList(),
          );
        },
      ),
    );
  }

  Widget _buildAssignedLeadsExpanse(Map<String, Map<String, List<Lead>>> groupedLeads, List<String> sortedReps) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: sortedReps.length,
        separatorBuilder: (context, index) => Divider(height: 1, color: Colors.grey[100]),
        itemBuilder: (context, index) {
          final repName = sortedReps[index];
          final statusGroups = groupedLeads[repName]!;
          final totalLeads = statusGroups.values.fold(0, (sum, list) => sum + list.length);
          
          return ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            leading: CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.primary.withOpacity(0.1),
              child: Text(
                repName.isNotEmpty ? repName[0].toUpperCase() : '?',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primary),
              ),
            ),
            title: Row(
              children: [
                Text(repName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.foreground)),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('$totalLeads leads', style: TextStyle(color: Colors.grey[600], fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            children: statusGroups.entries.map((statusEntry) {
              final status = statusEntry.key;
              final leads = statusEntry.value;
              
              return ExpansionTile(
                title: Padding(
                  padding: const EdgeInsets.only(left: 32),
                  child: Row(
                    children: [
                      _buildStatusBadge(status),
                      const SizedBox(width: 8),
                      Text('${leads.length} Leads', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
                children: leads.map((lead) {
                   final bool isSelected = _selectedLeadIds.contains(lead.id);
                   final bool isExpanded = _expandedLeadIds.contains(lead.id);

                   return Container(
                     color: isSelected ? AppTheme.primary.withOpacity(0.02) : Colors.transparent,
                     child: Column(
                       children: [
                         ListTile(
                          contentPadding: const EdgeInsets.only(left: 64, right: 24),
                          leading: Checkbox(
                            value: isSelected,
                            onChanged: (_) => _toggleLeadSelection(lead.id),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                          ),
                          title: Text(lead.companyName, style: const TextStyle(fontSize: 14, color: AppTheme.foreground)),
                          subtitle: _buildStatusBadge(lead.status),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(isExpanded ? Icons.history : Icons.history_outlined, 
                                  color: isExpanded ? AppTheme.primary : Colors.grey, size: 18),
                                onPressed: () => _toggleLeadExpansion(lead.id),
                                tooltip: 'View History',
                              ),
                              const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                            ],
                          ),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
                        ),
                        if (isExpanded) 
                          Padding(
                            padding: const EdgeInsets.only(left: 64),
                            child: _buildLeadHistoryDetails(lead.id),
                          ),
                       ],
                     ),
                   );
                }).toList(),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = Colors.grey[100]!;
    Color text = Colors.grey[600]!;
    
    switch (status.toLowerCase()) {
      case 'new':
        bg = Colors.blue[50]!;
        text = Colors.blue[700]!;
        break;
      case 'follow up':
      case 'follow-up':
        bg = Colors.orange[50]!;
        text = Colors.orange[700]!;
        break;
      case 'callback':
        bg = Colors.purple[50]!;
        text = Colors.purple[700]!;
        break;
      case 'signed':
        bg = Colors.green[50]!;
        text = Colors.green[700]!;
        break;
      case 'not interested':
      case 'lost':
        bg = Colors.red[50]!;
        text = Colors.red[700]!;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.toUpperCase(), 
        style: TextStyle(color: text, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5)
      ),
    );
  }

  Widget _buildBulkActionOverlay() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0e2d3a), // Matching sidebar background
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.accent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '${_selectedLeadIds.length}',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.foreground),
            ),
          ),
          const SizedBox(width: 16),
          const Text(
            'Leads selected',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const Spacer(),
          _buildBulkActionButton('Assign', Icons.person_add_alt_1_outlined, onPressed: _handleBulkAssign),
          const SizedBox(width: 12),
          _buildBulkActionButton('Unassign', Icons.person_remove_outlined, onPressed: _handleBulkUnassign),
          const SizedBox(width: 12),
          _buildBulkActionButton('Move', Icons.drive_file_move_outlined, onPressed: _handleBulkMoveToField),
          const SizedBox(width: 12),
          _buildBulkActionButton('Delete', Icons.delete_outline, isDestructive: true, onPressed: _handleBulkDelete),
          const SizedBox(width: 24),
          const VerticalDivider(color: Colors.white24, width: 1),
          const SizedBox(width: 12),
          IconButton(
            onPressed: _clearSelection,
            icon: const Icon(Icons.close, color: Colors.white70),
            tooltip: 'Clear Selection',
          ),
        ],
      ),
    );
  }

  Widget _buildBulkActionButton(String label, IconData icon, {bool isDestructive = false, required VoidCallback onPressed}) {
    return TextButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18, color: isDestructive ? Colors.redAccent : Colors.white),
      label: Text(
        label, 
        style: TextStyle(color: isDestructive ? Colors.redAccent : Colors.white, fontSize: 13)
      ),
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        backgroundColor: Colors.white.withOpacity(0.05),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
