import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'google_places_web_stub.dart' if (dart.library.html) 'google_places_web.dart';

class GooglePlacesService {
  final String apiKey;

  GooglePlacesService(this.apiKey);

  Future<List<Map<String, dynamic>>> searchPlaces(String query) async {
    debugPrint('GooglePlacesService.searchPlaces: kIsWeb is $kIsWeb');
    if (kIsWeb) {
      debugPrint('GooglePlacesService: Using Web Interop for searchPlaces');
      return GooglePlacesWebHelper.searchPlaces(query);
    }

    debugPrint('GooglePlacesService: Using REST API for searchPlaces (Mobile)');
    final url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=$query&types=establishment&components=country:au&key=$apiKey';
    final response = await http.get(Uri.parse(url));

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return List<Map<String, dynamic>>.from(data['predictions'] ?? []);
    }
    return [];
  }

  Future<Map<String, dynamic>?> getPlaceDetails(String placeId) async {
    if (kIsWeb) {
      debugPrint('GooglePlacesService: Using Web Interop for getPlaceDetails');
      return GooglePlacesWebHelper.getPlaceDetails(placeId);
    }

    debugPrint('GooglePlacesService: Using REST API for getPlaceDetails (Mobile)');
    final url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=$placeId&fields=name,formatted_address,address_components,geometry,website&key=$apiKey';
    final response = await http.get(Uri.parse(url));

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['result'];
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> searchNearby(double lat, double lng, int radius, {String? type}) async {
    if (kIsWeb) {
      debugPrint('GooglePlacesService: Using Web Interop for searchNearby');
      return GooglePlacesWebHelper.searchNearby(lat, lng, radius, type);
    }

    debugPrint('GooglePlacesService: Using REST API for searchNearby (Mobile)');
    final url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=$lat,$lng&radius=$radius${type != null ? '&type=$type' : ''}&key=$apiKey';
    final response = await http.get(Uri.parse(url));

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return List<Map<String, dynamic>>.from(data['results'] ?? []);
    }
    return [];
  }
}
