import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/lead.dart';
import '../../models/user_profile.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import 'lead_detail_screen.dart';

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
  
  @override
  void initState() {
    super.initState();
    _loadData();
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
      
      setState(() {
        _allLeads = results[0] as List<Lead>;
        _allUsers = results[1] as List<UserProfile>;
        _currentUserProfile = results[2] as UserProfile?;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading outbound leads: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFd0dfcd),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF095c7b))),
      );
    }

    // Grouping logic
    final filteredLeads = _allLeads.where((l) {
      final nameMatch = l.companyName.toLowerCase().contains(_searchQuery.toLowerCase());
      return nameMatch;
    }).toList();

    final myLeads = filteredLeads.where((l) {
      final myName = _currentUserProfile?.displayName ?? 'Me';
      return l.salesRepAssigned == myName;
    }).toList();
    final assignedLeads = filteredLeads.where((l) => l.salesRepAssigned != null && l.salesRepAssigned != 'None').toList();
    final unassignedLeads = filteredLeads.where((l) => l.salesRepAssigned == null || l.salesRepAssigned == 'None' || l.salesRepAssigned == '').toList();

    // Group assigned by rep
    final Map<String, List<Lead>> leadsByRep = {};
    for (var lead in assignedLeads) {
      final rep = lead.salesRepAssigned ?? 'Unknown';
      leadsByRep[rep] = (leadsByRep[rep] ?? [])..add(lead);
    }

    // Sort reps by name, but prioritize those in _allUsers
    final sortedReps = leadsByRep.keys.toList()..sort((a, b) {
      final aExists = _allUsers.any((u) => u.displayName == a || u.firstName == a);
      final bExists = _allUsers.any((u) => u.displayName == b || u.firstName == b);
      if (aExists && !bExists) return -1;
      if (!aExists && bExists) return 1;
      return a.compareTo(b);
    });

    return Scaffold(
      backgroundColor: const Color(0xFFd0dfcd),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Outbound Leads',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1a3a3a),
              ),
            ),
            const Text(
              'Manage and engage with your leads.',
              style: TextStyle(
                fontSize: 16,
                color: Colors.blueGrey,
              ),
            ),
            const SizedBox(height: 24),
            _buildFilterBar(),
            const SizedBox(height: 24),
            _buildSectionHeader('My Assigned Leads', trailing: _buildMyLeadsActions()),
            _buildMyLeadsContent(myLeads),
            const SizedBox(height: 24),
            _buildSectionHeader(
              'All Assigned Leads', 
              badge: '${assignedLeads.length} lead(s)',
              trailing: _buildActionButton('Export All Assigned', Icons.download),
            ),
            _buildAssignedLeadsList(leadsByRep, sortedReps),
            const SizedBox(height: 24),
            _buildSectionHeader(
              'All Unassigned Leads', 
              badge: '${unassignedLeads.length} lead(s)',
            ),
            _buildUnassignedLeadsContent(unassignedLeads),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.filter_alt_outlined, color: Colors.blueGrey, size: 20),
          const SizedBox(width: 8),
          const Text('Filters', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF1a3a3a))),
          const Spacer(),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                onChanged: (value) => setState(() => _searchQuery = value),
                decoration: const InputDecoration(
                  hintText: 'Search...',
                  isDense: true,
                  border: InputBorder.none,
                ),
              ),
            ),
          ),
          _buildTextButton('Refresh Data', Icons.refresh, _loadData),
          const SizedBox(width: 16),
          _buildTextButton('Toggle Filters', Icons.tune, () => setState(() => _showFilters = !_showFilters)),
        ],
      ),
    );
  }

  Widget _buildTextButton(String label, IconData icon, VoidCallback onPressed) {
    return InkWell(
      onTap: onPressed,
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.blueGrey),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(color: Colors.blueGrey, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, {String? badge, Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1a3a3a)),
          ),
          if (badge != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blueGrey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(badge, style: const TextStyle(fontSize: 11, color: Colors.blueGrey, fontWeight: FontWeight.bold)),
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
        _buildActionButton('Export My Leads', Icons.download, color: Colors.blueGrey.withOpacity(0.1)),
        const SizedBox(width: 8),
        _buildActionButton('Export All Leads', Icons.download),
      ],
    );
  }

  Widget _buildActionButton(String label, IconData icon, {Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color ?? const Color(0xFF095c7b).withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blueGrey.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF095c7b)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF095c7b), fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildMyLeadsContent(List<Lead> leads) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: leads.length,
        separatorBuilder: (context, index) => Divider(height: 1, color: Colors.grey[200]),
        itemBuilder: (context, index) {
          final lead = leads[index];
          return ListTile(
            leading: const Icon(Icons.star, color: Colors.amber, size: 20),
            title: Text(lead.companyName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text(lead.status, style: const TextStyle(fontSize: 12)),
            trailing: const Icon(Icons.chevron_right, color: Colors.blueGrey),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
          );
        },
      ),
    );
  }

  Widget _buildAssignedLeadsList(Map<String, List<Lead>> leadsByRep, List<String> sortedReps) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: sortedReps.length,
        separatorBuilder: (context, index) => Divider(height: 1, color: Colors.grey[200]),
        itemBuilder: (context, index) {
          final repName = sortedReps[index];
          final repLeads = leadsByRep[repName]!;
          
          return ExpansionTile(
            leading: const Icon(Icons.check_box_outline_blank, color: Colors.blueGrey, size: 20),
            title: Row(
              children: [
                Text(repName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1a3a3a))),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF095c7b),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('${repLeads.length} Leads', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            trailing: const Icon(Icons.keyboard_arrow_down, color: Colors.blueGrey),
            children: repLeads.map((lead) => ListTile(
              contentPadding: const EdgeInsets.only(left: 72, right: 16),
              title: Text(lead.companyName, style: const TextStyle(fontSize: 14)),
              subtitle: Text(lead.status, style: const TextStyle(fontSize: 12)),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
            )).toList(),
          );
        },
      ),
    );
  }

  Widget _buildUnassignedLeadsContent(List<Lead> leads) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: leads.isEmpty 
        ? const Text('No unassigned leads found.', style: TextStyle(color: Colors.blueGrey))
        : ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: leads.length,
            itemBuilder: (context, index) {
              final lead = leads[index];
              return ListTile(
                title: Text(lead.companyName),
                subtitle: Text(lead.industryCategory ?? 'No Category'),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
              );
            },
          ),
    );
  }
}
