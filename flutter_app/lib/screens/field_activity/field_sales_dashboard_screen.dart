import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../models/visit_note.dart';
import '../../models/appointment.dart';
import '../../models/user_profile.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import '../../services/location_service.dart';
import '../leads/outbound_leads_screen.dart';
import 'visit_notes_list_screen.dart';
import 'capture_visit_screen.dart';
import '../maps/prospecting_map_screen.dart';
import '../routes/route_list_screen.dart';

class FieldSalesDashboardScreen extends StatefulWidget {
  const FieldSalesDashboardScreen({super.key});

  @override
  State<FieldSalesDashboardScreen> createState() => _FieldSalesDashboardScreenState();
}

class _FieldSalesDashboardScreenState extends State<FieldSalesDashboardScreen> {
  final _firestoreService = FirestoreService();
  final _locationService = LocationService();
  final _authService = AuthService();

  UserProfile? _currentUserProfile;
  List<VisitNote> _allVisitNotes = [];
  List<Appointment> _allAppointments = [];
  Position? _currentPosition;
  bool _isLoading = true;
  bool _isLocating = false;
  String? _locationError;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    try {
      final user = await _authService.user.first;
      if (user != null) {
        final profile = await _authService.getUserProfile(user.uid);
        final notes = await _firestoreService.getVisitNotes();
        final appointments = await _firestoreService.getAllAppointments();
        
        setState(() {
          _currentUserProfile = profile;
          _allVisitNotes = notes;
          _allAppointments = appointments;
        });

        await _requestLocation();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _requestLocation() async {
    setState(() {
      _isLocating = true;
      _locationError = null;
    });

    try {
      final position = await _locationService.getCurrentLocation();
      setState(() {
        _currentPosition = position;
        _isLocating = false;
      });
    } catch (e) {
      setState(() {
        _locationError = 'Could not determine location.';
        _isLocating = false;
      });
    }
  }

  Map<String, dynamic> _calculateWeeklyStats() {
    if (_currentUserProfile == null) return {};

    final now = DateTime.now();
    final weekStart = now.subtract(Duration(days: now.weekday - 1));
    final startOfCurrentWeek = DateTime(weekStart.year, weekStart.month, weekStart.day);

    final visitsThisWeek = _allVisitNotes.where((n) =>
        n.capturedByUid == _currentUserProfile!.id &&
        n.createdAt.isAfter(startOfCurrentWeek)).toList();

    final totalVisits = visitsThisWeek.length;
    final convertedThisWeek = visitsThisWeek.where((n) => n.status == 'Converted' || n.outcome['type'] == 'Customer Signed').toList();
    final totalConverted = convertedThisWeek.length;

    final convertedLeadIds = convertedThisWeek.map((n) => n.id).toSet();
    final completedAppts = _allAppointments.where((appt) =>
        convertedLeadIds.contains(appt.id) && appt.appointmentStatus == 'Completed').length;

    final conversionRate = totalVisits > 0 ? (totalConverted / totalVisits) * 100 : 0.0;

    return {
      'totalVisits': totalVisits,
      'totalConverted': totalConverted,
      'totalCompletedAppts': completedAppts,
      'conversionRate': conversionRate,
    };
  }

  List<VisitNote> _getNearbyVisits() {
    if (_currentPosition == null) return [];

    final nearby = _allVisitNotes.where((note) {
      if (note.address?.lat == null || note.address?.lng == null) return false;
      final distance = _locationService.distanceBetween(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        note.address!.lat!,
        note.address!.lng!,
      );
      return distance <= 1000; // 1km radius
    }).toList();

    nearby.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return nearby;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final stats = _calculateWeeklyStats();
    final nearbyVisits = _getNearbyVisits();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Sales Dashboard'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: _loadInitialData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, ${_currentUserProfile?.firstName ?? 'Agent'}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _buildStatsGrid(stats),
              const SizedBox(height: 24),
              _buildNearbyVisitsHeader(),
              const SizedBox(height: 12),
              _buildNearbyVisitsList(nearbyVisits),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: InkWell(
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const VisitNotesListScreen())),
              child: _buildStatCard('Visits', stats['totalVisits']?.toString() ?? '0', Icons.location_on),
            )),
            const SizedBox(width: 12),
            Expanded(child: InkWell(
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const OutboundLeadsScreen())),
              child: _buildStatCard('Check-ins', stats['totalConverted']?.toString() ?? '0', Icons.person_add),
            )),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildStatCard('Appts Done', stats['totalCompletedAppts']?.toString() ?? '0', Icons.event_available)),
            const SizedBox(width: 12),
            Expanded(child: _buildStatCard('Conv. Rate', '${stats['conversionRate']?.toStringAsFixed(1) ?? '0'}%', Icons.percent)),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const ProspectingMapScreen())),
                icon: const Icon(Icons.add_road),
                label: const Text('Plan Route'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const RouteListScreen())),
                icon: const Icon(Icons.route),
                label: const Text('My Routes'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const CaptureVisitScreen())),
            icon: const Icon(Icons.add_location_alt),
            label: const Text('Capture New Visit'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF095c7b),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: const Color(0xFF095c7b)),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildNearbyVisitsHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Recent Visits Near Me',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        if (_isLocating)
          const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
        else
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _requestLocation,
          ),
      ],
    );
  }

  Widget _buildNearbyVisitsList(List<VisitNote> visits) {
    if (_locationError != null) {
      return Center(
        child: Column(
          children: [
            const Icon(Icons.location_off, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(_locationError!, textAlign: TextAlign.center),
            TextButton(onPressed: _requestLocation, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (_currentPosition == null && !_isLocating) {
      return const Center(child: Text('Location access required.'));
    }

    if (visits.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            children: [
              Icon(Icons.near_me_disabled, size: 48, color: Colors.grey[300]),
              const SizedBox(height: 12),
              const Text('No recent visits in this area.', style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Column(
      children: visits.map((note) => _buildVisitItem(note)).toList(),
    );
  }

  Widget _buildVisitItem(VisitNote note) {
    final distance = _locationService.distanceBetween(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      note.address!.lat!,
      note.address!.lng!,
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(note.companyName ?? 'Unknown Business', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${distance.toStringAsFixed(0)}m away • ${DateFormat.yMMMd().format(note.createdAt)}'),
            const SizedBox(height: 4),
            Text(note.outcome['type'] ?? 'No outcome', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          // If the visit note has a leadId, navigate to its detail
          // In Next.js, it links to /companies/[id] or /leads/[id]
          // For now, we'll try to find if it has a leadId
          // This would require updating VisitNote model to include leadId if available
        },
      ),
    );
  }
}
