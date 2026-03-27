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
import '../../widgets/layout/main_layout.dart';
import '../../utils/marker_utils.dart';

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
  
  MapType _currentMapType = MapType.normal;
  final TextEditingController _searchController = TextEditingController();
  
  // Custom Marker Icons
  final Map<Color, BitmapDescriptor> _markerIcons = {};
  
  // Filter state
  String _companySearch = '';
  List<String> _selectedFranchisees = [];
  List<String> _selectedStatuses = [];
  List<String> _selectedDialers = [];
  List<String> _selectedStates = [];
  String _selectedLeadType = 'all'; 
  String _selectedCampaign = 'all';
  String _hasVisitNote = 'all'; 

  LatLng _initialPosition = const LatLng(-33.8688, 151.2093); // Sydney default

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _initializeMarkerIcons();
    _loadLeadsAndLocation();
  }

  Future<void> _initializeMarkerIcons() async {
    final colorsToCache = [
      ...MarkerUtils.mapColors.values,
      Colors.white, // For any fallback
    ];
    
    for (final color in colorsToCache) {
      final bitmap = await MarkerUtils.createCustomMarkerBitmap(color);
      if (mounted) {
        setState(() {
          _markerIcons[color] = bitmap;
        });
      }
    }
    _updateMarkers();
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

  bool _applyFilters(Lead lead) {
    if (_companySearch.isNotEmpty && !lead.companyName.toLowerCase().contains(_companySearch.toLowerCase())) return false;
    if (_selectedFranchisees.isNotEmpty && !(_selectedFranchisees.contains(lead.franchisee))) return false;
    if (_selectedStatuses.isNotEmpty && !(_selectedStatuses.contains(lead.status))) return false;
    if (_selectedStates.isNotEmpty && !(_selectedStates.contains(lead.address?['state']))) return false;
    if (_selectedDialers.isNotEmpty && !(_selectedDialers.contains(lead.dialerAssigned))) return false;
    
    if (_selectedLeadType == 'customers' && lead.status != 'Won') return false;
    if (_selectedLeadType == 'leads' && lead.status == 'Won') return false;
    
    if (_selectedCampaign != 'all' && lead.campaign != _selectedCampaign) return false;
    
    if (_hasVisitNote == 'yes' && (lead.visitNoteID == null || lead.visitNoteID!.isEmpty)) return false;
    if (_hasVisitNote == 'no' && (lead.visitNoteID != null && lead.visitNoteID!.isNotEmpty)) return false;

    return true;
  }

  void _updateMarkers() {
    final Map<String, List<Lead>> groupedLeads = {};
    for (var lead in _allLeads) {
      if (lead.latitude == null || lead.longitude == null) continue;
      if (!_applyFilters(lead)) continue;

      final key = '${lead.latitude},${lead.longitude}';
      groupedLeads.putIfAbsent(key, () => []).add(lead);
    }

    final newMarkers = groupedLeads.entries.map((entry) {
      final leads = entry.value;
      final firstLead = leads.first;
      final lat = firstLead.latitude!;
      final lng = firstLead.longitude!;
      
      String displayStatus = firstLead.status;
      if (leads.any((l) => l.status == 'Won')) {
        displayStatus = 'Won';
      } else if (leads.any((l) => ['Qualified', 'Pre Qualified', 'Trialing ShipMate'].contains(l.status))) {
        displayStatus = 'Qualified';
      } else if (leads.any((l) => ['In Progress', 'Contacted', 'Connected'].contains(l.status))) {
        displayStatus = 'In Progress';
      }

      final isSelected = leads.any((l) => _selectedLeads.any((rl) => rl.id == l.id));
      
      // Determine color
      Color markerColor = isSelected 
          ? MarkerUtils.mapColors['Selected']! 
          : MarkerUtils.getColorForStatus(displayStatus);

      return Marker(
        markerId: MarkerId('group_${firstLead.id}'),
        position: LatLng(lat, lng),
        icon: _markerIcons[markerColor] ?? BitmapDescriptor.defaultMarker,
        onTap: () {
          if (_isSelectionMode && leads.length == 1) {
            _toggleLeadSelection(leads.first);
          } else {
            _showGroupInfo(leads);
          }
        },
      );
    }).toSet();

    if (mounted) {
      setState(() {
        _markers = newMarkers;
      });
    }
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

  void _showGroupInfo(List<Lead> leads) {
    if (leads.length == 1) {
      _showLeadInfo(leads.first);
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                '${leads.length} Records at this Location',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: leads.length,
                itemBuilder: (context, index) {
                  final lead = leads[index];
                  return ListTile(
                    title: Text(lead.companyName),
                    subtitle: Text(lead.status),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_isSelectionMode)
                          IconButton(
                            icon: Icon(
                              _selectedLeads.any((l) => l.id == lead.id)
                                  ? Icons.remove_circle
                                  : Icons.add_circle,
                              color: _selectedLeads.any((l) => l.id == lead.id)
                                  ? Colors.red
                                  : Colors.green,
                            ),
                            onPressed: () {
                              _toggleLeadSelection(lead);
                              Navigator.pop(context);
                              _showGroupInfo(leads);
                            },
                          ),
                        TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) => LeadDetailScreen(lead: lead)),
                            );
                          },
                          child: const Text('View'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(lead.companyName,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis),
                ),
                if (lead.status == 'Won')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Signed Customer',
                        style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(lead.address?['formatted_address'] ?? 'No address',
                style: TextStyle(color: Colors.grey[600], fontSize: 14)),
            const SizedBox(height: 4),
            Text(lead.status, style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.w500)),
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
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF095c7b),
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('View Profile'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _toggleLeadSelection(lead);
                      if (!_isSelectionMode) setState(() => _isSelectionMode = true);
                    },
                    child: Text(_selectedLeads.any((l) => l.id == lead.id) ? 'Remove' : 'Add to Route'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
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

  List<String> get _uniqueFranchisees => _allLeads.map((l) => l.franchisee).where((f) => f != null).cast<String>().toSet().toList()..sort();
  List<String> get _uniqueStatuses => _allLeads.map((l) => l.status).toSet().toList()..sort();
  List<String> get _uniqueDialers => _allLeads.map((l) => l.dialerAssigned).where((d) => d != null).cast<String>().toSet().toList()..sort();
  List<String> get _uniqueStates => _allLeads.map((l) => l.address?['state']).where((s) => s != null).cast<String>().toSet().toList()..sort();
  List<String> get _uniqueCampaigns => _allLeads.map((l) => l.campaign).where((c) => c != null).cast<String>().toSet().toList()..sort();

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.of(context).size.width < 1024;
    
    return MainLayout(
      title: 'Prospecting Map',
      currentRoute: '/leads/map',
      showHeader: false,
      padding: EdgeInsets.zero,
      child: Scaffold(
        appBar: AppBar(
          title: Text(_isSelectionMode ? 'Plan Route (${_selectedLeads.length})' : 'Territory Map'),
          backgroundColor: const Color(0xFF095c7b),
          foregroundColor: Colors.white,
          leading: isMobile ? Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ) : null,
          actions: [
            IconButton(
              icon: Icon(_currentMapType == MapType.normal ? Icons.satellite : Icons.map),
              onPressed: () => setState(() => _currentMapType = _currentMapType == MapType.normal ? MapType.satellite : MapType.normal),
              tooltip: 'Toggle Satellite',
            ),
            Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.filter_list),
                onPressed: () => Scaffold.of(context).openEndDrawer(),
                tooltip: 'Filters',
              ),
            ),
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
        endDrawer: _buildFilterDrawer(),
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
                    mapType: _currentMapType,
                    mapToolbarEnabled: false,
                  ),
            
            // Search Bar Area (Top)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: Colors.grey),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: const InputDecoration(
                            hintText: 'Search by Company...',
                            border: InputBorder.none,
                          ),
                          onChanged: (value) {
                            setState(() => _companySearch = value);
                            _updateMarkers();
                          },
                        ),
                      ),
                      if (_searchController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _companySearch = '');
                            _updateMarkers();
                          },
                        ),
                    ],
                  ),
                ),
              ),
            ),

            // Legend (Bottom Left)
            Positioned(
              bottom: _isSelectionMode ? 100 : 20,
              left: 16,
              child: _buildLegend(),
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
      ),
    );
  }

  Widget _buildFilterDrawer() {
    return Drawer(
      child: Column(
        children: [
          AppBar(
            title: const Text('Map Filters'),
            backgroundColor: const Color(0xFF095c7b),
            foregroundColor: Colors.white,
            automaticallyImplyLeading: false,
            actions: [
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ],
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildFilterSection('Franchisee', _uniqueFranchisees, _selectedFranchisees, (val) => setState(() => _selectedFranchisees = val)),
                _buildFilterSection('Status', _uniqueStatuses, _selectedStatuses, (val) => setState(() => _selectedStatuses = val)),
                _buildFilterSection('Assigned Dialer', _uniqueDialers, _selectedDialers, (val) => setState(() => _selectedDialers = val)),
                _buildFilterSection('State', _uniqueStates, _selectedStates, (val) => setState(() => _selectedStates = val)),
                
                const SizedBox(height: 16),
                const Text('Lead Type', style: TextStyle(fontWeight: FontWeight.bold)),
                DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedLeadType,
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All Items')),
                    DropdownMenuItem(value: 'customers', child: Text('Signed Customers')),
                    DropdownMenuItem(value: 'leads', child: Text('Leads')),
                  ],
                  onChanged: (val) => setState(() {
                    _selectedLeadType = val!;
                    _updateMarkers();
                  }),
                ),

                const SizedBox(height: 16),
                const Text('Campaign', style: TextStyle(fontWeight: FontWeight.bold)),
                DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedCampaign,
                  items: [
                    const DropdownMenuItem(value: 'all', child: Text('All Campaigns')),
                    ..._uniqueCampaigns.map((c) => DropdownMenuItem(value: c, child: Text(c))),
                  ],
                  onChanged: (val) => setState(() {
                    _selectedCampaign = val!;
                    _updateMarkers();
                  }),
                ),

                const SizedBox(height: 16),
                const Text('Visit Note', style: TextStyle(fontWeight: FontWeight.bold)),
                DropdownButton<String>(
                  isExpanded: true,
                  value: _hasVisitNote,
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All')),
                    DropdownMenuItem(value: 'yes', child: Text('With Visit Note')),
                    DropdownMenuItem(value: 'no', child: Text('Without Visit Note')),
                  ],
                  onChanged: (val) => setState(() {
                    _hasVisitNote = val!;
                    _updateMarkers();
                  }),
                ),
                
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _selectedFranchisees = [];
                      _selectedStatuses = [];
                      _selectedDialers = [];
                      _selectedStates = [];
                      _selectedLeadType = 'all';
                      _selectedCampaign = 'all';
                      _hasVisitNote = 'all';
                      _companySearch = '';
                      _searchController.clear();
                    });
                    _updateMarkers();
                  },
                  child: const Text('Clear All Filters'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton(
              onPressed: () {
                _updateMarkers();
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: const Color(0xFF095c7b),
                foregroundColor: Colors.white,
              ),
              child: const Text('Apply Filters'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection(String title, List<String> options, List<String> selected, Function(List<String>) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: options.map((option) {
            final isSelected = selected.contains(option);
            return FilterChip(
              label: Text(option, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : Colors.black)),
              selected: isSelected,
              selectedColor: const Color(0xFF095c7b),
              onSelected: (bool value) {
                final newList = List<String>.from(selected);
                if (value) {
                  newList.add(option);
                } else {
                  newList.remove(option);
                }
                onChanged(newList);
                _updateMarkers();
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildLegend() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Legend', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 4),
            _buildLegendItem(MarkerUtils.mapColors['Won']!, 'Signed Customer'),
            _buildLegendItem(MarkerUtils.mapColors['In Progress']!, 'In Progress'),
            _buildLegendItem(MarkerUtils.mapColors['Qualified']!, 'Qualified'),
            _buildLegendItem(MarkerUtils.mapColors['Lost']!, 'Lost / Unqualified'),
            _buildLegendItem(MarkerUtils.mapColors['Selected']!, 'Selected'),
            _buildLegendItem(MarkerUtils.mapColors['Default']!, 'New/Other'),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 10)),
        ],
      ),
    );
  }

  // Removed _getMarkerHue as it was replaced by MarkerUtils
}
