import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../leads/lead_detail_screen.dart';
import '../../widgets/layout/main_layout.dart';

class SignedCustomersScreen extends StatefulWidget {
  const SignedCustomersScreen({super.key});

  @override
  State<SignedCustomersScreen> createState() => _SignedCustomersScreenState();
}

class _SignedCustomersScreenState extends State<SignedCustomersScreen> with SingleTickerProviderStateMixin {
  final _firestoreService = FirestoreService();
  final _locationService = LocationService();
  late TabController _tabController;
  
  List<Lead> _allSigned = [];
  List<Lead> _filteredSigned = [];
  Set<Marker> _markers = {};
  bool _isLoading = true;
  LatLng _initialPosition = const LatLng(-33.8688, 151.2093); // Sydney
  
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _firestoreService.getLeadsByStatus(['Won']),
        _firestoreService.getCompanies(),
        _locationService.getCurrentLocation(),
      ]);

      final leads = results[0] as List<Lead>;
      final companies = results[1] as List<Lead>;
      final position = results[2];

      setState(() {
        _allSigned = [...leads, ...companies];
        if (position != null) {
          final pos = position as dynamic;
          _initialPosition = LatLng(pos.latitude, pos.longitude);
        }
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _applyFilters() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredSigned = _allSigned.where((l) {
        return l.companyName.toLowerCase().contains(query) ||
               (l.address?['street']?.toString().toLowerCase().contains(query) ?? false);
      }).toList();
      _updateMarkers();
    });
  }

  void _updateMarkers() {
    _markers = _filteredSigned
        .where((l) => l.latitude != null && l.longitude != null)
        .map((l) => Marker(
              markerId: MarkerId(l.id),
              position: LatLng(l.latitude!, l.longitude!),
              infoWindow: InfoWindow(title: l.companyName, snippet: l.status),
              onTap: () => _showLeadInfo(l),
            ))
        .toSet();
  }

  void _showLeadInfo(Lead lead) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lead.companyName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(lead.address?['street'] ?? 'No address'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead)));
              },
              child: const Text('View Details'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.of(context).size.width < 1024;
    
    return MainLayout(
      title: 'Signed Customers',
      currentRoute: '/signed-customers',
      showHeader: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Signed Customers'),
          backgroundColor: const Color(0xFF095c7b),
          foregroundColor: Colors.white,
          leading: isMobile ? Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ) : null,
          bottom: TabBar(
            controller: _tabController,
            tabs: const [Tab(icon: Icon(Icons.map), text: 'Map'), Tab(icon: Icon(Icons.list), text: 'List')],
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
          ),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Search signed customers...',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                ),
                onChanged: (val) => _applyFilters(),
              ),
            ),
            Expanded(
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildMapView(),
                      _buildListView(),
                    ],
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapView() {
    return GoogleMap(
      initialCameraPosition: CameraPosition(target: _initialPosition, zoom: 12),
      markers: _markers,
      myLocationEnabled: true,
    );
  }

  Widget _buildListView() {
    return ListView.builder(
      itemCount: _filteredSigned.length,
      itemBuilder: (context, index) {
        final lead = _filteredSigned[index];
        return ListTile(
          leading: const Icon(Icons.business, color: Color(0xFF095c7b)),
          title: Text(lead.companyName),
          subtitle: Text(lead.address?['city'] ?? 'No city'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead))),
        );
      },
    );
  }
}
