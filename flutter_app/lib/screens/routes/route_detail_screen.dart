import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/route_model.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../field_activity/check_in_screen.dart';

class RouteDetailScreen extends StatefulWidget {
  final RouteModel route;

  const RouteDetailScreen({super.key, required this.route});

  @override
  State<RouteDetailScreen> createState() => _RouteDetailScreenState();
}

class _RouteDetailScreenState extends State<RouteDetailScreen> {
  final _firestoreService = FirestoreService();
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  bool _isLoadingNearby = false;

  @override
  void initState() {
    super.initState();
    _initMapData();
  }

  void _initMapData() {
    final markers = widget.route.leads.asMap().entries.map((entry) {
      final index = entry.key;
      final stop = entry.value;
      return Marker(
        markerId: MarkerId('stop_${index}_${stop.id}'),
        position: LatLng(stop.latitude, stop.longitude),
        infoWindow: InfoWindow(
          title: '${index + 1}. ${stop.companyName}',
          snippet: stop.address['street'] ?? '',
        ),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
      );
    }).toSet();

    setState(() {
      _markers = markers;
      if (widget.route.directions != null) {
        _decodeAndApplyPolylines(widget.route.directions!);
      }
    });
  }

  void _decodeAndApplyPolylines(String directionsJson) {
    try {
      final directions = jsonDecode(directionsJson);
      final routes = directions['routes'] as List?;
      if (routes != null && routes.isNotEmpty) {
        final overviewPolyline = routes[0]['overview_polyline']['points'] as String;
        final points = _decodePolyline(overviewPolyline);
        setState(() {
          _polylines.add(
            Polyline(
              polylineId: const PolylineId('route_path'),
              points: points,
              color: const Color(0xFF095c7b),
              width: 5,
            ),
          );
        });
      }
    } catch (e) {
      debugPrint('Error decoding polylines: $e');
    }
  }

  List<LatLng> _decodePolyline(String encoded) {
    List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return points;
  }

  void _startNavigation() async {
    if (widget.route.leads.isEmpty) return;

    final String origin = widget.route.startPoint ?? 
        '${widget.route.leads.first.latitude},${widget.route.leads.first.longitude}';
    final String destination = widget.route.endPoint ?? 
        '${widget.route.leads.last.latitude},${widget.route.leads.last.longitude}';
    
    final String waypoints = widget.route.leads
        .skip(1)
        .take(widget.route.leads.length - 2)
        .map((l) => '${l.latitude},${l.longitude}')
        .join('|');

    final String url = 'https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination&waypoints=$waypoints&travelmode=${widget.route.travelMode.toLowerCase()}';
    
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _findNearby(RouteStop stop) async {
    setState(() => _isLoadingNearby = true);
    try {
      // Get all leads and companies (simplified, might need pagination or better filtering in production)
      final allLeads = await _firestoreService.getLeads().first;
      final allCompanies = await _firestoreService.getCompanies();
      final combined = [...allLeads, ...allCompanies];

      final nearby = combined.where((item) {
        if (item.latitude == null || item.longitude == null || item.id == stop.id) return false;
        final distance = Geolocator.distanceBetween(
          stop.latitude, 
          stop.longitude, 
          item.latitude!, 
          item.longitude!
        );
        return distance <= 1000; // 1km radius
      }).toList();

      if (mounted) {
        _showNearbyDialog(stop, nearby);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error finding nearby customers: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingNearby = false);
    }
  }

  void _showNearbyDialog(RouteStop stop, List<Lead> nearby) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Nearby Stops to ${stop.companyName}'),
        content: SizedBox(
          width: double.maxFinite,
          child: nearby.isEmpty 
            ? const Text('No nearby signed customers or leads found within 1km.')
            : ListView.builder(
                shrinkWrap: true,
                itemCount: nearby.length,
                itemBuilder: (context, index) {
                  final item = nearby[index];
                  return ListTile(
                    title: Text(item.companyName),
                    subtitle: Text(item.status),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // Navigate to lead/company detail if needed
                      Navigator.pop(context);
                    },
                  );
                },
              ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.route.name),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(
                  widget.route.leads.first.latitude,
                  widget.route.leads.first.longitude,
                ),
                zoom: 12,
              ),
              onMapCreated: (controller) {
                _mapController = controller;
                // Fit bounds
                if (widget.route.leads.isNotEmpty) {
                  final bounds = _getBounds(widget.route.leads);
                  _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 50));
                }
              },
              markers: _markers,
              polylines: _polylines,
            ),
          ),
          if (widget.route.totalDistance != null && widget.route.totalDuration != null)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              color: Colors.grey[200],
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStat(Icons.directions_car, widget.route.totalDistance!, 'Distance'),
                  _buildStat(Icons.access_time, widget.route.totalDuration!, 'Duration'),
                ],
              ),
            ),
          Expanded(
            flex: 3,
            child: ListView.builder(
              itemCount: widget.route.leads.length,
              itemBuilder: (context, index) {
                final stop = widget.route.leads[index];
                return _buildStopItem(stop, index + 1);
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: _startNavigation,
            icon: const Icon(Icons.play_arrow),
            label: const Text('START ROUTE'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }

  LatLngBounds _getBounds(List<RouteStop> stops) {
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

  Widget _buildStat(IconData icon, String value, String label) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.grey[600]),
            const SizedBox(width: 4),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildStopItem(RouteStop stop, int number) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: const Color(0xFF095c7b),
        child: Text('$number', style: const TextStyle(color: Colors.white)),
      ),
      title: Text(stop.companyName, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(stop.address['street'] ?? ''),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.near_me_outlined),
            onPressed: _isLoadingNearby ? null : () => _findNearby(stop),
          ),
          IconButton(
            icon: const Icon(Icons.check_circle_outline),
            onPressed: () {
              // Get full lead object and navigate to check in
              _firestoreService.getLeads().first.then((leads) {
                final lead = leads.firstWhere((l) => l.id == stop.id, orElse: () => Lead(id: stop.id, companyName: stop.companyName, status: 'New', profile: 'New'));
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => CheckInScreen(lead: lead)),
                );
              });
            },
          ),
        ],
      ),
    );
  }
}
