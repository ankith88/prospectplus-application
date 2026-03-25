import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class DirectionsService {
  final String apiKey = dotenv.get('GOOGLE_MAPS_API_KEY');
  static const String _baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

  DirectionsService();

  Future<Map<String, dynamic>?> getDirections({
    required LatLng origin,
    required LatLng destination,
    List<LatLng> waypoints = const [],
    bool optimizeWaypoints = true,
    String travelMode = 'driving',
  }) async {
    final originStr = '${origin.latitude},${origin.longitude}';
    final destStr = '${destination.latitude},${destination.longitude}';
    
    String waypointsStr = '';
    if (waypoints.isNotEmpty) {
      waypointsStr = 'waypoints=';
      if (optimizeWaypoints) {
        waypointsStr += 'optimize:true|';
      }
      waypointsStr += waypoints.map((w) => '${w.latitude},${w.longitude}').join('|');
    }

    final url = '$_baseUrl?origin=$originStr&destination=$destStr&$waypointsStr&mode=$travelMode&key=$apiKey';

    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'OK') {
          return data;
        } else {
          throw Exception('Directions API error: ${data['status']} - ${data['error_message']}');
        }
      } else {
        throw Exception('Failed to load directions: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
}
