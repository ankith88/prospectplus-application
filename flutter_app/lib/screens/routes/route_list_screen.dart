import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/route_model.dart';
import '../../services/route_service.dart';
import '../../services/auth_service.dart';
import 'route_detail_screen.dart';

class RouteListScreen extends StatefulWidget {
  const RouteListScreen({super.key});

  @override
  State<RouteListScreen> createState() => _RouteListScreenState();
}

class _RouteListScreenState extends State<RouteListScreen> {
  final _routeService = RouteService();
  final _authService = AuthService();
  
  String _nameFilter = '';
  DateTime? _dateFilter;
  String? _selectedUserId;
  
  bool _isAdmin = false;
  String _currentUserId = '';

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final user = _authService.currentUser;
    if (user != null) {
      final profile = await _authService.getUserProfile(user.uid);
      if (mounted) {
        setState(() {
          _currentUserId = user.uid;
          _isAdmin = profile?.role == 'admin' || profile?.role == 'Field Sales Admin';
        });
      }
    }
  }

  void _startRoute(RouteModel route) async {
    if (route.leads.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No stops in this route.')),
      );
      return;
    }

    final String origin = route.startPoint ?? 
        '${route.leads.first.latitude},${route.leads.first.longitude}';
    final String destination = route.endPoint ?? 
        '${route.leads.last.latitude},${route.leads.last.longitude}';
    
    final String waypoints = route.leads
        .skip(1)
        .take(route.leads.length - 2)
        .map((l) => '${l.latitude},${l.longitude}')
        .join('|');

    final String url = 'https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination&waypoints=$waypoints&travelmode=${route.travelMode.toLowerCase()}';
    
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch Google Maps.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved Routes'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: StreamBuilder<List<RouteModel>>(
              stream: _isAdmin 
                  ? _routeService.getAllUserRoutes() 
                  : _routeService.getUserRoutes(_currentUserId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }

                final routes = snapshot.data ?? [];
                final filteredRoutes = routes.where((r) {
                  final nameMatch = r.name.toLowerCase().contains(_nameFilter.toLowerCase());
                  final dateMatch = _dateFilter == null || 
                      (r.scheduledDate != null && 
                       DateUtils.isSameDay(r.scheduledDate, _dateFilter));
                  final userMatch = _selectedUserId == null || r.userId == _selectedUserId;
                  return nameMatch && dateMatch && userMatch;
                }).toList();

                if (filteredRoutes.isEmpty) {
                  return const Center(child: Text('No routes found.'));
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredRoutes.length,
                  itemBuilder: (context, index) {
                    final route = filteredRoutes[index];
                    return _buildRouteCard(route);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[100],
      child: Column(
        children: [
          TextField(
            decoration: const InputDecoration(
              hintText: 'Filter by route name...',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              filled: true,
              fillColor: Colors.white,
            ),
            onChanged: (value) => setState(() => _nameFilter = value),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _dateFilter ?? DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2030),
                    );
                    if (picked != null) {
                      setState(() => _dateFilter = picked);
                    }
                  },
                  icon: const Icon(Icons.calendar_today),
                  label: Text(_dateFilter == null 
                      ? 'Filter by date' 
                      : DateFormat('MMM d, yyyy').format(_dateFilter!)),
                  style: OutlinedButton.styleFrom(backgroundColor: Colors.white),
                ),
              ),
              if (_dateFilter != null)
                IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () => setState(() => _dateFilter = null),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRouteCard(RouteModel route) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
               builder: (context) => RouteDetailScreen(route: route),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      route.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (route.status == 'Active')
                    const Badge(
                      label: Text('Active'),
                      backgroundColor: Colors.red,
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${route.leads.length} stops • Created on ${DateFormat('MMM d, yyyy').format(route.createdAt)}',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              if (_isAdmin && route.userName != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.person, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        route.userName!,
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => RouteDetailScreen(route: route),
                        ),
                      );
                    },
                    child: const Text('Load Route'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => _startRoute(route),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Start'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
