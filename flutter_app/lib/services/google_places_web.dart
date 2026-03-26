import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
// ignore: avoid_web_libraries_in_flutter
import 'dart:js_util' as js_util;
import 'package:flutter/foundation.dart';

class GooglePlacesWebHelper {
  static bool _initialized = false;

  static void _ensureInitialized() {
    if (_initialized) return;

    final windowObj = html.window;
    if (js_util.hasProperty(windowObj, 'googlePlacesSearch') && 
        js_util.hasProperty(windowObj, 'googlePlaceDetails')) {
      _initialized = true;
      debugPrint('GooglePlacesWebHelper: JS functions already present in window.');
      return;
    }

    debugPrint('GooglePlacesWebHelper: Injecting JS functions via script tag...');
    final script = html.ScriptElement()
      ..text = """
        if (!window.googlePlacesSearch) {
          window.googlePlacesSearch = function(query) {
            return new Promise((resolve) => {
              try {
                if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                  resolve([]); return;
                }
                const service = new google.maps.places.AutocompleteService();
                service.getPlacePredictions({
                  input: query,
                  types: ['establishment'],
                  componentRestrictions: { country: 'au' }
                }, (predictions, status) => {
                  if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                    resolve([]); return;
                  }
                  resolve(predictions.map(p => ({
                    description: p.description,
                    place_id: p.place_id,
                  })));
                });
              } catch (e) { resolve([]); }
            });
          };
        }

        if (!window.googlePlaceDetails) {
          window.googlePlaceDetails = function(placeId) {
            return new Promise((resolve) => {
              try {
                if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                  resolve(null); return;
                }
                const div = document.createElement('div');
                const service = new google.maps.places.PlacesService(div);
                service.getDetails({
                  placeId: placeId,
                  fields: ['name', 'formatted_address', 'address_components', 'geometry', 'website']
                }, (result, status) => {
                  if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
                    resolve(null); return;
                  }
                  resolve({
                    name: result.name,
                    formatted_address: result.formatted_address,
                    geometry: {
                      location: {
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng()
                      }
                    },
                    website: result.website,
                    address_components: result.address_components
                  });
                });
              } catch (e) { resolve(null); }
            });
          };
        }

        if (!window.googleNearbySearch) {
          window.googleNearbySearch = function(lat, lng, radius, type) {
            return new Promise((resolve) => {
              try {
                if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                  resolve([]); return;
                }
                const div = document.createElement('div');
                const service = new google.maps.places.PlacesService(div);
                service.nearbySearch({
                  location: { lat: lat, lng: lng },
                  radius: radius,
                  type: type || undefined
                }, (results, status) => {
                  if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                    resolve([]); return;
                  }
                  resolve(results.map(r => ({
                    name: r.name,
                    place_id: r.place_id,
                    vicinity: r.vicinity,
                    geometry: {
                      location: {
                        lat: r.geometry.location.lat(),
                        lng: r.geometry.location.lng()
                      }
                    }
                  })));
                });
              } catch (e) { resolve([]); }
            });
          };
        }
      """;
    html.document.head!.append(script);
    _initialized = true;
  }

  static Future<List<Map<String, dynamic>>> searchPlaces(String query) async {
    try {
      _ensureInitialized();
      final windowObj = html.window;
      
      if (!js_util.hasProperty(windowObj, 'googlePlacesSearch')) {
        debugPrint('GooglePlacesWebHelper: googlePlacesSearch NOT FOUND on window, retrying injection...');
        _initialized = false;
        _ensureInitialized();
      }

      final jsPromise = js_util.callMethod(windowObj, 'googlePlacesSearch', [query]);
      final result = await js_util.promiseToFuture(jsPromise);
      final dartified = js_util.dartify(result) as List;
      
      // Manual conversion to Map<String, dynamic> to avoid LinkedMap errors in DDC
      return dartified.map((e) {
        final map = e as Map;
        final result = <String, dynamic>{};
        map.forEach((k, v) => result[k.toString()] = v);
        return result;
      }).toList();
    } catch (e) {
      debugPrint('GooglePlacesWebHelper Error in searchPlaces: $e');
      return [];
    }
  }

  static Future<Map<String, dynamic>?> getPlaceDetails(String placeId) async {
    try {
      _ensureInitialized();
      final windowObj = html.window;
      final jsPromise = js_util.callMethod(windowObj, 'googlePlaceDetails', [placeId]);
      final result = await js_util.promiseToFuture(jsPromise);
      final dartified = js_util.dartify(result);
      if (dartified == null) return null;
      
      final map = dartified as Map;
      final resultMap = <String, dynamic>{};
      map.forEach((k, v) => resultMap[k.toString()] = v);
      return resultMap;
    } catch (e) {
      debugPrint('GooglePlacesWebHelper Error in getPlaceDetails: $e');
      return null;
    }
  }

  static Future<List<Map<String, dynamic>>> searchNearby(double lat, double lng, int radius, String? type) async {
    try {
      _ensureInitialized();
      final windowObj = html.window;
      final jsPromise = js_util.callMethod(windowObj, 'googleNearbySearch', [lat, lng, radius, type]);
      final result = await js_util.promiseToFuture(jsPromise);
      final dartified = js_util.dartify(result) as List;
      
      return dartified.map((e) {
        final map = e as Map;
        final result = <String, dynamic>{};
        map.forEach((k, v) => result[k.toString()] = v);
        return result;
      }).toList();
    } catch (e) {
      debugPrint('GooglePlacesWebHelper Error in searchNearby: $e');
      return [];
    }
  }
}
