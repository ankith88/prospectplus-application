import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import 'package:csv/csv.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../../models/route_model.dart';
import '../../models/user_profile.dart';
import '../../models/visit_note.dart';
import '../../models/lead.dart';
import '../../services/route_service.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../theme/app_theme.dart';
import '../leads/lead_detail_screen.dart';
import '../companies/company_detail_screen.dart';
import '../../widgets/layout/main_layout.dart';
import '../../utils/error_utils.dart';

class ProspectingAreasScreen extends StatefulWidget {
  const ProspectingAreasScreen({super.key});

  @override
  State<ProspectingAreasScreen> createState() => _ProspectingAreasScreenState();
}

class _ProspectingAreasScreenState extends State<ProspectingAreasScreen> with SingleTickerProviderStateMixin {
  final FirestoreService _firestoreService = FirestoreService();
  final AuthService _authService = AuthService();
  final RouteService _routeService = RouteService();
  
  GoogleMapController? _mapController;
  late TabController _tabController;
  RouteModel? _selectedArea;
  UserProfile? _userProfile;
  bool _isLoading = true;
  
  Set<Marker> _markers = {};
  Set<Polygon> _polygons = {};
  Set<Polyline> _polylines = {};
  Set<Circle> _circles = {};
  
  List<VisitNote> _allVisitNotes = [];
  List<Lead> _allLeads = [];
  List<Lead> _allCompanies = [];
  
  bool _showHeatmap = false;
  bool _showTimeline = false;
  String _mapTypeId = 'roadmap';
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadUserProfile();
    _searchController.addListener(() {
      if (_selectedArea != null) {
        setState(() {
          _searchQuery = _searchController.text;
          _updateMapData(_selectedArea!);
        });
      }
    });
  }

  Future<void> _loadUserProfile() async {
    try {
      final user = _authService.currentUser;
      if (user != null) {
        final profile = await _authService.getUserProfile(user.uid);
        if (mounted) {
          setState(() {
            _userProfile = profile;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ErrorUtils.showSnackBar(context, 'Error loading profile: $e');
      }
    }
  }

  Future<void> _loadAreaData(RouteModel area) async {
    final franchisee = _userProfile?.franchisee;
    
    try {
      final results = await Future.wait([
        _firestoreService.getVisitNotes(franchiseeId: franchisee, limit: 500),
        _firestoreService.getLeads(franchisee: franchisee, limit: 500).first,
        _firestoreService.getCompanies(franchisee: franchisee, limit: 500),
      ]);

      if (mounted) {
        setState(() {
          _allVisitNotes = results[0] as List<VisitNote>;
          _allLeads = results[1] as List<Lead>;
          _allCompanies = results[2] as List<Lead>;
          _updateMapData(area);
        });
      }
    } catch (e) {
      if (mounted) {
        ErrorUtils.showSnackBar(context, 'Error loading area data: $e');
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _mapController?.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _onAreaSelected(RouteModel area) async {
    setState(() {
      _selectedArea = area;
      _showHeatmap = false;
      _showTimeline = false;
      _searchController.clear();
      _searchQuery = '';
      _zoomToArea(area);
    });
    
    await _loadAreaData(area);
  }

  void _updateMapData(RouteModel area) {
    if (!mounted) return;
    
    final Set<Marker> markers = {};
    final Set<Polygon> polygons = {};
    final Set<Polyline> polylines = {};
    final Set<Circle> circles = {};

    // 1. Draw Area Shapes
    if (area.shape != null) {
      if (area.shape!.type == 'polygon' && area.shape!.paths != null) {
        polygons.add(
          Polygon(
            polygonId: PolygonId(area.id ?? 'area_poly'),
            points: area.shape!.paths![0].map((l) => LatLng(l.lat, l.lng)).toList(),
            fillColor: Colors.blue.withOpacity(0.1),
            strokeColor: Colors.blue,
            strokeWidth: 2,
          ),
        );
      } else if (area.shape!.type == 'rectangle' && area.shape!.bounds != null) {
        final b = area.shape!.bounds!;
        polygons.add(
          Polygon(
            polygonId: PolygonId(area.id ?? 'area_rect'),
            points: [
              LatLng(b['north']!, b['west']!),
              LatLng(b['north']!, b['east']!),
              LatLng(b['south']!, b['east']!),
              LatLng(b['south']!, b['west']!),
            ],
            fillColor: Colors.blue.withOpacity(0.1),
            strokeColor: Colors.blue,
            strokeWidth: 2,
          ),
        );
      }
    }

    // 2. Fetch Nearby Data
    final nearbyNotes = _getNearbyVisitNotes(area).where((n) {
      if (_searchQuery.isEmpty) return true;
      return (n.companyName ?? '').toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    final nearbySigned = _getNearbySignedLeads(area).where((l) {
      if (_searchQuery.isEmpty) return true;
      return l.companyName.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    // 3. Grouping Logic
    final Map<String, List<Map<String, dynamic>>> groups = {};
    
    for (final note in nearbyNotes) {
      final key = "${note.address?.lat},${note.address?.lng}";
      groups.putIfAbsent(key, () => []).add({'type': 'visit', 'data': note});
    }
    
    for (final lead in nearbySigned) {
      final key = "${lead.latitude},${lead.longitude}";
      groups.putIfAbsent(key, () => []).add({'type': 'signed', 'data': lead});
    }

    // 4. Create Markers and Layers
    if (!_showHeatmap) {
      // Add grouped markers
      groups.forEach((key, items) {
        final coords = key.split(',');
        final lat = double.parse(coords[0]);
        final lng = double.parse(coords[1]);
        
        Color markerColor = AppTheme.primary;
        if (items.any((i) => i['type'] == 'signed')) markerColor = Colors.green;
        if (items.any((i) => i['type'] == 'visit')) markerColor = Colors.orange;

        markers.add(
          Marker(
            markerId: MarkerId(key),
            position: LatLng(lat, lng),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              markerColor == Colors.green ? BitmapDescriptor.hueGreen : 
              markerColor == Colors.orange ? BitmapDescriptor.hueOrange : 
              BitmapDescriptor.hueCyan
            ),
            onTap: () => _showGroupDetails(items),
          ),
        );
      });

      // Add street markers
      if (area.streets != null) {
        for (final street in area.streets!) {
          markers.add(
            Marker(
              markerId: MarkerId('street_${street.placeId}'),
              position: LatLng(street.latitude, street.longitude),
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
              infoWindow: InfoWindow(title: street.description),
            ),
          );
        }
      }

      // Add Timeline Polyline
      if (_showTimeline && nearbyNotes.isNotEmpty) {
        final List<LatLng> path = nearbyNotes.map((n) => LatLng(n.address!.lat!, n.address!.lng!)).toList();
        polylines.add(
          Polyline(
            polylineId: const PolylineId('timeline'),
            points: path,
            color: Colors.blue.shade700,
            width: 3,
          ),
        );
      }
    } else {
      // Heatmap view (Circles)
      for (final note in nearbyNotes) {
        circles.add(
          Circle(
            circleId: CircleId('heat_${note.id}'),
            center: LatLng(note.address!.lat!, note.address!.lng!),
            radius: 50,
            fillColor: Colors.orange.withOpacity(0.4),
            strokeColor: Colors.orange.withOpacity(0.1),
            strokeWidth: 1,
          ),
        );
      }
    }

    setState(() {
      _markers = markers;
      _polygons = polygons;
      _polylines = polylines;
      _circles = circles;
    });

    if (_mapController != null) {
       _zoomToArea(area);
    }
  }

  void _showGroupDetails(List<Map<String, dynamic>> items) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text('${items.length} Records at this Location', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: ListView.separated(
                itemCount: items.length,
                separatorBuilder: (context, index) => const Divider(),
                itemBuilder: (context, index) {
                  final item = items[index];
                  final type = item['type'];
                  final data = item['data'];
                  
                  String title = '';
                  String status = '';
                  String subtitle = '';
                  
                  if (type == 'visit') {
                    final visit = data as VisitNote;
                    title = visit.companyName ?? 'Unknown Company';
                    status = 'Visited';
                    subtitle = 'Visited on ${DateFormat.yMMMd().format(visit.createdAt)}';
                  } else {
                    final lead = data as Lead;
                    title = lead.companyName;
                    status = lead.status;
                    subtitle = lead.industryCategory ?? 'No industry set';
                  }

                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: type == 'visit' ? Colors.orange[100] : Colors.green[100],
                      child: Icon(type == 'visit' ? Icons.business : Icons.star, color: type == 'visit' ? Colors.orange : Colors.green),
                    ),
                    title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(subtitle),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: (type == 'visit' ? Colors.orange : Colors.green).withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                          child: Text(status, style: TextStyle(color: (type == 'visit' ? Colors.orange : Colors.green), fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.pop(context);
                      if (type == 'visit') {
                        final visit = data as VisitNote;
                        if (visit.leadId != null) {
                           final lead = _allLeads.firstWhere((l) => l.id == visit.leadId, orElse: () => _allCompanies.firstWhere((c) => c.id == visit.leadId));
                           Navigator.push(context, MaterialPageRoute(builder: (context) => (lead.status == 'Won' || lead.status == 'Lost Customer') ? CompanyDetailScreen(company: lead) : LeadDetailScreen(lead: lead)));
                        }
                      } else {
                        final lead = data as Lead;
                        Navigator.push(context, MaterialPageRoute(builder: (context) => (lead.status == 'Won' || lead.status == 'Lost Customer') ? CompanyDetailScreen(company: lead) : LeadDetailScreen(lead: lead)));
                      }
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<VisitNote> _getNearbyVisitNotes(RouteModel area) {
    final center = _getAreaCenter(area);
    if (center == null) return [];

    return _allVisitNotes.where((note) {
      if (note.address?.lat == null || note.address?.lng == null) return false;
      final distance = Geolocator.distanceBetween(
        center.latitude,
        center.longitude,
        note.address!.lat!,
        note.address!.lng!,
      );
      return distance <= 5000;
    }).toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  List<Lead> _getNearbySignedLeads(RouteModel area) {
    final center = _getAreaCenter(area);
    if (center == null) return [];

    final combined = [..._allLeads, ..._allCompanies];
    return combined.where((lead) {
      if (lead.status != 'Won' && lead.status != 'Lost Customer') return false;
      if (lead.latitude == null || lead.longitude == null) return false;
      final distance = Geolocator.distanceBetween(
        center.latitude,
        center.longitude,
        lead.latitude!,
        lead.longitude!,
      );
      return distance <= 5000;
    }).toList();
  }

  LatLng? _getAreaCenter(RouteModel area) {
    if (area.shape?.type == 'polygon' && area.shape?.paths != null && area.shape!.paths!.isNotEmpty) {
      final points = area.shape!.paths![0];
      if (points.isEmpty) return null;
      double sumLat = 0;
      double sumLng = 0;
      for (final p in points) {
        sumLat += p.lat;
        sumLng += p.lng;
      }
      return LatLng(sumLat / points.length, sumLng / points.length);
    } else if (area.shape?.type == 'rectangle' && area.shape?.bounds != null) {
      final b = area.shape!.bounds!;
      return LatLng((b['north']! + b['south']!) / 2, (b['east']! + b['west']!) / 2);
    } else if (area.leads.isNotEmpty) {
      return LatLng(area.leads.first.latitude, area.leads.first.longitude);
    } else if (area.streets != null && area.streets!.isNotEmpty) {
      return LatLng(area.streets!.first.latitude, area.streets!.first.longitude);
    }
    return null;
  }

  void _zoomToArea(RouteModel area) {
    LatLngBounds? bounds;
    
    if (area.shape?.type == 'polygon' && area.shape?.paths != null && area.shape!.paths!.isNotEmpty) {
        bounds = _getPolygonBounds(area.shape!.paths![0]);
    } else if (area.shape?.type == 'rectangle' && area.shape?.bounds != null) {
        final b = area.shape!.bounds!;
        bounds = LatLngBounds(
          southwest: LatLng(b['south']!, b['west']!),
          northeast: LatLng(b['north']!, b['east']!),
        );
    } else if (area.leads.isNotEmpty) {
        bounds = _getStopsBounds(area.leads);
    } else if (area.streets != null && area.streets!.isNotEmpty) {
        bounds = _getStreetsBounds(area.streets!);
    }

    if (bounds != null) {
      _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 50));
    }
  }

  LatLngBounds _getPolygonBounds(List<RouteLatLng> points) {
    if (points.isEmpty) return LatLngBounds(southwest: const LatLng(0,0), northeast: const LatLng(0,0));
    double minLat = points.first.lat;
    double maxLat = points.first.lat;
    double minLng = points.first.lng;
    double maxLng = points.first.lng;

    for (final p in points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  LatLngBounds _getStreetsBounds(List<RouteStreet> streets) {
    if (streets.isEmpty) return LatLngBounds(southwest: const LatLng(0,0), northeast: const LatLng(0,0));
    double minLat = streets.first.latitude;
    double maxLat = streets.first.latitude;
    double minLng = streets.first.longitude;
    double maxLng = streets.first.longitude;

    for (final street in streets) {
      if (street.latitude < minLat) minLat = street.latitude;
      if (street.latitude > maxLat) maxLat = street.latitude;
      if (street.longitude < minLng) minLng = street.longitude;
      if (street.longitude > maxLng) maxLng = street.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  LatLngBounds _getStopsBounds(List<RouteStop> stops) {
    if (stops.isEmpty) return LatLngBounds(southwest: const LatLng(0,0), northeast: const LatLng(0,0));
    double minLat = stops.first.latitude;
    double maxLat = stops.first.latitude;
    double minLng = stops.first.longitude;
    double maxLng = stops.first.longitude;

    for (final stop in stops) {
      if (stop.latitude < minLat) minLat = stop.latitude;
      if (stop.latitude > maxLat) maxLat = stop.latitude;
      if (stop.longitude < minLng) minLng = stop.longitude;
      if (stop.longitude > maxLng) maxLng = stop.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  Future<void> _handleUpdateStatus(RouteModel area, String newStatus) async {
    try {
      if (newStatus == 'Completed') {
        final myName = _userProfile?.displayName ?? 'User';
        await _routeService.completeRoute(area.userId, area.id!, myName);
        setState(() {
          _selectedArea = area.copyWith(
            status: 'Completed',
            completedAt: DateTime.now(),
            completedBy: myName,
          );
        });
      } else {
        await _routeService.updateRouteStatus(area.userId, area.id!, newStatus);
        setState(() {
          _selectedArea = area.copyWith(status: newStatus);
        });
      }
      if (mounted) {
        ErrorUtils.showSnackBar(context, 'Area ${newStatus.toLowerCase()} successfully');
      }
    } catch (e) {
      if (mounted) {
        ErrorUtils.showSnackBar(context, 'Error updating area status');
      }
    }
  }

  Future<void> _handleDeleteArea(RouteModel area) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Area'),
        content: Text('Are you sure you want to delete "${area.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _routeService.deleteUserRoute(area.userId, area.id!);
        if (mounted) {
          setState(() {
            if (_selectedArea?.id == area.id) _selectedArea = null;
          });
          ErrorUtils.showSnackBar(context, 'Area deleted.');
        }
      } catch (e) {
        if (mounted) {
          ErrorUtils.showSnackBar(context, 'Error deleting area.');
        }
      }
    }
  }

  Future<void> _handleCreateFollowup(RouteModel area) async {
    try {
      await _routeService.createFollowupArea(
        originalArea: area,
        reviewerName: _userProfile?.displayName ?? 'Admin',
      );
      if (mounted) {
        ErrorUtils.showSnackBar(context, 'Follow-up area created.');
      }
    } catch (e) {
      if (mounted) {
        ErrorUtils.showSnackBar(context, 'Error creating follow-up.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final isAdmin = ['admin', 'Lead Gen Admin', 'Field Sales Admin', 'Franchisee'].contains(_userProfile?.role);

    return MainLayout(
      title: 'Prospecting Areas',
      currentRoute: '/prospecting-areas',
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Container(
            color: AppTheme.primary,
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              indicatorColor: AppTheme.accent,
              tabs: const [
                Tab(text: 'Pending'),
                Tab(text: 'Active'),
                Tab(text: 'Review'),
                Tab(text: 'Completed'),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<RouteModel>>(
              stream: _routeService.getProspectingAreas(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text(
                        'Error loading areas: ${snapshot.error}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  );
                }
                if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                
                final allAreas = snapshot.data!;
                
                return TabBarView(
                  controller: _tabController,
                  children: [
                    _buildAreaList(allAreas.where((a) => a.status == 'Pending Approval').toList(), isAdmin),
                    _buildAreaList(allAreas.where((a) => a.status == 'Approved' || a.status == 'Active' || a.status == null).toList(), isAdmin),
                    _buildAreaList(allAreas.where((a) => a.status == 'Completed').toList(), isAdmin),
                    _buildAreaList(allAreas.where((a) => a.status == 'Reviewed').toList(), isAdmin),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAreaList(List<RouteModel> areas, bool isAdmin) {
    if (areas.isEmpty) return const Center(child: Text('No areas found in this category.'));

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: areas.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final area = areas[index];
        final isSelected = _selectedArea?.id == area.id;

        return Card(
          elevation: isSelected ? 4 : 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: isSelected ? const BorderSide(color: AppTheme.primary, width: 2) : BorderSide.none,
          ),
          child: Column(
            children: [
              ListTile(
                title: Text(area.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Created by ${area.userName ?? 'Unknown'} on ${DateFormat('MMM d').format(area.createdAt)}'),
                    if (area.status == 'Completed' && area.completedAt != null)
                      Text('Finished by ${area.completedBy ?? 'Unknown'} on ${DateFormat('MMM d, p').format(area.completedAt!)}', 
                        style: const TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
                trailing: _getStatusBadge(area.status),
                onTap: () => _onAreaSelected(area),
              ),
              if (isSelected) ...[
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search leads or notes...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    ),
                  ),
                ),
                SizedBox(
                  height: 350,
                  child: GoogleMap(
                    initialCameraPosition: const CameraPosition(target: LatLng(0, 0), zoom: 2),
                    onMapCreated: (controller) {
                      _mapController = controller;
                      _zoomToArea(area);
                    },
                    markers: _markers,
                    polygons: _polygons,
                    polylines: _polylines,
                    circles: _circles,
                    mapType: _mapTypeId == 'satellite' ? MapType.satellite : MapType.normal,
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                  ),
                ),
                _buildMapControls(area, isAdmin),
                if (_showTimeline) _buildTimelineReview(area),
                _buildNearbyLeadsList(area),
                _buildNearbySignedCustomersList(area),
                _buildActionButtons(area, isAdmin),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildMapControls(RouteModel area, bool isAdmin) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (isAdmin && (area.status == 'Completed' || area.status == 'Reviewed')) ...[
            FilterChip(
              label: const Text('Coverage Map'),
              selected: _showHeatmap,
              onSelected: (val) {
                setState(() {
                  _showHeatmap = val;
                  if (val) _showTimeline = false;
                  _updateMapData(area);
                });
              },
              selectedColor: Colors.orange.withOpacity(0.2),
              checkmarkColor: Colors.orange,
              labelStyle: TextStyle(color: _showHeatmap ? Colors.orange.shade900 : Colors.black87),
              avatar: Icon(Icons.fireplace, color: _showHeatmap ? Colors.orange : Colors.grey),
            ),
            FilterChip(
              label: const Text('Timeline Review'),
              selected: _showTimeline,
              onSelected: (val) {
                setState(() {
                  _showTimeline = val;
                  if (val) _showHeatmap = false;
                  _updateMapData(area);
                });
              },
              selectedColor: Colors.blue.withOpacity(0.2),
              checkmarkColor: Colors.blue,
              labelStyle: TextStyle(color: _showTimeline ? Colors.blue.shade900 : Colors.black87),
              avatar: Icon(Icons.history, color: _showTimeline ? Colors.blue : Colors.grey),
            ),
          ],
          ActionChip(
            label: Text(_mapTypeId == 'roadmap' ? 'Satellite' : 'Roadmap'),
            onPressed: () {
              setState(() {
                _mapTypeId = _mapTypeId == 'roadmap' ? 'satellite' : 'roadmap';
                _updateMapData(area);
              });
            },
            avatar: Icon(_mapTypeId == 'roadmap' ? Icons.satellite : Icons.map),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineReview(RouteModel area) {
    final nearbyNotes = _getNearbyVisitNotes(area);
    if (nearbyNotes.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Path Audit Sequence', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              IconButton(
                icon: const Icon(Icons.download, color: AppTheme.primary),
                onPressed: () => _exportPathAudit(area),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 150,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: nearbyNotes.length,
            itemBuilder: (context, index) {
              final note = nearbyNotes[index];
              return Container(
                width: 200,
                margin: const EdgeInsets.only(right: 12),
                child: Card(
                  child: ListTile(
                    dense: true,
                    leading: CircleAvatar(radius: 12, child: Text((index + 1).toString(), style: const TextStyle(fontSize: 10))),
                    title: Text(note.companyName ?? 'Unknown', maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(DateFormat.jm().format(note.createdAt)),
                    onTap: () {
                       _mapController?.animateCamera(CameraUpdate.newLatLng(LatLng(note.address!.lat!, note.address!.lng!)));
                    },
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Future<void> _exportPathAudit(RouteModel area) async {
    final nearbyNotes = _getNearbyVisitNotes(area);
    if (nearbyNotes.isEmpty) {
      ErrorUtils.showSnackBar(context, 'No visits to export.');
      return;
    }

    final headers = ['Sequence', 'Date', 'Day', 'Time', 'Company', 'Captured By', 'Status', 'Outcome'];
    final rows = nearbyNotes.asMap().entries.map((entry) {
      final index = entry.key;
      final note = entry.value;
      final d = note.createdAt;
      
      return [
        (index + 1).toString(),
        DateFormat('yyyy-MM-dd').format(d),
        DateFormat('EEEE').format(d),
        DateFormat('p').format(d),
        note.companyName ?? 'Unknown',
        note.capturedBy,
        'Visited',
        note.outcome['type'] ?? 'N/A'
      ];
    }).toList();

    String csvData = const ListToCsvConverter().convert([headers, ...rows]);
    final directory = await getTemporaryDirectory();
    final file = File('${directory.path}/path_audit_${area.name.replaceAll(' ', '_')}.csv');
    await file.writeAsString(csvData);

    await Share.shareXFiles([XFile(file.path)], text: 'Path Audit for ${area.name}');
  }

  Widget _buildActionButtons(RouteModel area, bool isAdmin) {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          if (isAdmin && area.status == 'Pending Approval')
            ElevatedButton.icon(
              onPressed: () => _handleUpdateStatus(area, 'Approved'),
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Approve'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            ),
          if (isAdmin && area.status == 'Completed') ...[
            ElevatedButton.icon(
              onPressed: () => _handleUpdateStatus(area, 'Reviewed'),
              icon: const Icon(Icons.rate_review_outlined),
              label: const Text('Finalize Review'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: () => _handleCreateFollowup(area),
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Follow-up'),
            ),
          ],
          if (!isAdmin && (area.status == 'Approved' || area.status == 'Active' || area.status == null))
            ElevatedButton.icon(
              onPressed: () => _handleUpdateStatus(area, 'Completed'),
              icon: const Icon(Icons.done_all),
              label: const Text('Mark as Complete'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
            ),
          const SizedBox(width: 8),
          if (area.userId == _userProfile?.id || isAdmin)
            IconButton(
              onPressed: () => _handleDeleteArea(area),
              icon: const Icon(Icons.delete_outline, color: Colors.red),
            ),
        ],
      ),
    );
  }

  Widget _getStatusBadge(String? status) {
    Color color = Colors.grey;
    String label = status ?? 'Active';
    
    switch (label) {
      case 'Pending Approval': color = Colors.orange; break;
      case 'Approved': color = Colors.green; break;
      case 'Active': color = Colors.blue; break;
      case 'Completed': color = Colors.purple; break;
      case 'Reviewed': color = Colors.teal; break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildNearbyLeadsList(RouteModel area) {
    final nearbyNotes = _getNearbyVisitNotes(area).where((n) {
      if (_searchQuery.isEmpty) return true;
      return (n.companyName ?? '').toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    if (nearbyNotes.isEmpty && _searchQuery.isEmpty) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                const Icon(Icons.history, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                Text('Recent Visits in Area (${nearbyNotes.length})', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          if (nearbyNotes.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Center(child: Text('No recent visits match your search.', style: TextStyle(color: Colors.grey))),
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 20,
                columns: const [
                  DataColumn(label: Text('Company')),
                  DataColumn(label: Text('Date')),
                  DataColumn(label: Text('Status')),
                  DataColumn(label: Text('Outcome')),
                ],
                rows: nearbyNotes.map((note) {
                  return DataRow(onSelectChanged: (_) {
                    if (note.leadId != null) {
                      final lead = _allLeads.followedBy(_allCompanies).where((l) => l.id == note.leadId).firstOrNull;
                      if (lead != null) {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead)));
                      }
                    }
                  }, cells: [
                    DataCell(Text(note.companyName ?? 'Unknown', style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w500))),
                    DataCell(Text(DateFormat('MMM d, p').format(note.createdAt))),
                    DataCell(Text(note.status ?? 'N/A')),
                    DataCell(Text(note.outcome['type'] ?? 'N/A')),
                  ]);
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNearbySignedCustomersList(RouteModel area) {
    final nearbySigned = _getNearbySignedLeads(area).where((l) {
      if (_searchQuery.isEmpty) return true;
      return l.companyName.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    if (nearbySigned.isEmpty && _searchQuery.isEmpty) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                const Icon(Icons.star, color: Colors.green, size: 20),
                const SizedBox(width: 8),
                Text('Nearby Signed Customers (${nearbySigned.length})', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          if (nearbySigned.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Center(child: Text('No signed customers match your search.', style: TextStyle(color: Colors.grey))),
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 20,
                columns: const [
                  DataColumn(label: Text('Company')),
                  DataColumn(label: Text('Suburb')),
                  DataColumn(label: Text('Action')),
                ],
                rows: nearbySigned.map((lead) {
                  return DataRow(cells: [
                    DataCell(Text(lead.companyName, style: const TextStyle(fontWeight: FontWeight.w500))),
                    DataCell(Text(lead.address?['city'] ?? 'N/A')),
                    DataCell(
                      TextButton(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => CompanyDetailScreen(company: lead))),
                        child: const Text('View Profile'),
                      ),
                    ),
                  ]);
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}
