import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import '../../models/lead.dart';
import '../../models/route_model.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../services/directions_service.dart';
import '../../services/route_service.dart';
import '../../services/auth_service.dart';
import '../leads/lead_detail_screen.dart';
import '../routes/route_list_screen.dart';

class ProspectingMapScreen extends StatefulWidget {
  const ProspectingMapScreen({super.key});

  @override
  State<ProspectingMapScreen> createState() => _ProspectingMapScreenState();
}

class _ProspectingMapScreenState extends State<ProspectingMapScreen> {
  final _firestoreService = FirestoreService();
  final _locationService = LocationService();
  final _routeService = RouteService();
  final _authService = AuthService();
  final _directionsService = DirectionsService();
  
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  List<Lead> _allLeads = [];
  List<Lead> _selectedLeads = [];
  bool _isLoading = true;
  bool _isSelectionMode = false;
  bool _isCalculating = false;
  LatLng _initialPosition = const LatLng(-33.8688, 151.2093); // Sydney default

  @override
  void initState() {
    super.initState();
    _loadLeadsAndLocation();
  }

  Future<void> _loadLeadsAndLocation() async {
    setState(() => _isLoading = true);
    try {
      _firestoreService.getLeads().listen((leads) {
        if (mounted) {
          setState(() {
            _allLeads = leads;
            _updateMarkers();
          });
        }
      });

      final position = await _locationService.getCurrentLocation();
      if (position != null && mounted) {
        setState(() {
          _initialPosition = LatLng(position.latitude, position.longitude);
          _isLoading = false;
        });
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(_initialPosition, 14),
        );
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading map: $e')),
        );
      }
    }
  }

  void _updateMarkers() {
    final newMarkers = _allLeads
        .where((lead) => lead.latitude != null && lead.longitude != null)
        .map((lead) {
      final isSelected = _selectedLeads.any((l) => l.id == lead.id);
      return Marker(
        markerId: MarkerId(lead.id),
        position: LatLng(lead.latitude!, lead.longitude!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          isSelected ? BitmapDescriptor.hueViolet : _getMarkerHue(lead.status),
        ),
        onTap: () {
          if (_isSelectionMode) {
            _toggleLeadSelection(lead);
          } else {
            _showLeadInfo(lead);
          }
        },
      );
    }).toSet();

    setState(() {
      _markers = newMarkers;
    });
  }

  void _toggleLeadSelection(Lead lead) {
    setState(() {
      if (_selectedLeads.any((l) => l.id == lead.id)) {
        _selectedLeads.removeWhere((l) => l.id == lead.id);
      } else {
        _selectedLeads.add(lead);
      }
      _updateMarkers();
    });
  }

  void _showLeadInfo(Lead lead) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lead.companyName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(lead.status, style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => LeadDetailScreen(lead: lead)),
                      );
                    },
                    child: const Text('View Profile'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      setState(() {
                        _isSelectionMode = true;
                        if (!_selectedLeads.any((l) => l.id == lead.id)) {
                           _selectedLeads.add(lead);
                           _updateMarkers();
                        }
                      });
                    },
                    child: const Text('Add to Route'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  double _getMarkerHue(String? status) {
    switch (status?.toLowerCase()) {
      case 'won': return BitmapDescriptor.hueGreen;
      case 'contacted':
      case 'in progress':
         return BitmapDescriptor.hueBlue;
      case 'qualified':
      case 'trialing shipmate':
         return BitmapDescriptor.hueYellow;
      case 'lost':
      case 'unqualified':
         return BitmapDescriptor.hueRed;
      default: return BitmapDescriptor.hueAzure;
    }
  }

  Future<void> _calculateRoute() async {
    if (_selectedLeads.length < 2) return;
    
    setState(() => _isCalculating = true);
    try {
      final directions = await _directionsService.getDirections(
        origin: LatLng(_selectedLeads.first.latitude!, _selectedLeads.first.longitude!),
        destination: LatLng(_selectedLeads.last.latitude!, _selectedLeads.last.longitude!),
        waypoints: _selectedLeads.skip(1).take(_selectedLeads.length - 2)
            .map((l) => LatLng(l.latitude!, l.longitude!)).toList(),
      );

      if (directions != null) {
        if (mounted) {
           _showSaveRouteDialog(directions);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Routing Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isCalculating = false);
    }
  }

  void _showSaveRouteDialog(Map<String, dynamic> directions) {
    final nameController = TextEditingController(text: 'Route - ${DateFormat('MMM d').format(DateTime.now())}');
    DateTime scheduledDate = DateTime.now();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Save Optimized Route'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Route Name'),
            ),
            const SizedBox(height: 16),
            const Text('The route stops will be automatically optimized for efficiency.'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final user = _authService.currentUser;
              if (user == null) return;
              
              final profile = await _authService.getUserProfile(user.uid);
              
              final route = RouteModel(
                userId: user.uid,
                userName: profile?.displayName,
                name: nameController.text,
                createdAt: DateTime.now(),
                scheduledDate: scheduledDate,
                leads: _selectedLeads.map((l) => RouteStop(
                  id: l.id,
                  companyName: l.companyName,
                  latitude: l.latitude!,
                  longitude: l.longitude!,
                  address: l.address ?? {},
                )).toList(),
                directions: jsonEncode(directions),
                totalDistance: _extractTotalDistance(directions),
                totalDuration: _extractTotalDuration(directions),
              );

              await _routeService.saveUserRoute(user.uid, route);
              
              if (mounted) {
                Navigator.pop(context);
                setState(() {
                  _isSelectionMode = false;
                  _selectedLeads = [];
                  _updateMarkers();
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Route saved successfully!')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  String _extractTotalDistance(Map<String, dynamic> directions) {
    int total = 0;
    for (var leg in directions['routes'][0]['legs']) {
      total += (leg['distance']['value'] as int);
    }
    return '${(total / 1000).toStringAsFixed(1)} km';
  }

  String _extractTotalDuration(Map<String, dynamic> directions) {
    int total = 0;
    for (var leg in directions['routes'][0]['legs']) {
      total += (leg['duration']['value'] as int);
    }
    final duration = Duration(seconds: total);
    return '${duration.inHours}h ${duration.inMinutes % 60}m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isSelectionMode ? 'Plan Route (${_selectedLeads.length})' : 'Prospecting Map'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        actions: [
          if (_isSelectionMode)
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => setState(() {
                _isSelectionMode = false;
                _selectedLeads = [];
                _updateMarkers();
              }),
            )
          else
            IconButton(
              icon: const Icon(Icons.add_road),
              onPressed: () => setState(() => _isSelectionMode = true),
            ),
          IconButton(
            icon: const Icon(Icons.route),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const RouteListScreen()),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : GoogleMap(
                  initialCameraPosition: CameraPosition(target: _initialPosition, zoom: 12),
                  onMapCreated: (controller) => _mapController = controller,
                  markers: _markers,
                  polylines: _polylines,
                  myLocationEnabled: true,
                  myLocationButtonEnabled: true,
                  mapType: MapType.normal,
                ),
          if (_isSelectionMode && _selectedLeads.length >= 2)
            Positioned(
              bottom: 20,
              left: 20,
              right: 20,
              child: ElevatedButton.icon(
                onPressed: _isCalculating ? null : _calculateRoute,
                icon: _isCalculating 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.auto_fix_high),
                label: Text(_isCalculating ? 'CALCULATING...' : 'OPTIMIZE & SAVE ROUTE'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF095c7b),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
