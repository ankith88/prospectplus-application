import 'package:cloud_firestore/cloud_firestore.dart';

class RouteModel {
  final String? id;
  final String userId;
  final String? userName;
  final String name;
  final DateTime createdAt;
  final List<RouteStop> leads;
  final String travelMode;
  final String? startPoint;
  final String? endPoint;
  final String? directions; // JSON stringified DirectionsResult
  final DateTime? scheduledDate;
  final String? totalDistance;
  final String? totalDuration;
  final bool isProspectingArea;
  final bool isUnassigned;
  final String? notes;
  final List<RouteStreet>? streets;
  final String? status;
  final List<String>? imageUrls;
  final RouteShape? shape;

  RouteModel({
    this.id,
    required this.userId,
    this.userName,
    required this.name,
    required this.createdAt,
    required this.leads,
    this.travelMode = 'DRIVING',
    this.startPoint,
    this.endPoint,
    this.directions,
    this.scheduledDate,
    this.totalDistance,
    this.totalDuration,
    this.isProspectingArea = false,
    this.isUnassigned = false,
    this.notes,
    this.streets,
    this.status,
    this.imageUrls,
    this.shape,
  });

  factory RouteModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return RouteModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      userName: data['userName'],
      name: data['name'] ?? '',
      createdAt: (data['createdAt'] is Timestamp)
          ? (data['createdAt'] as Timestamp).toDate()
          : DateTime.tryParse(data['createdAt']?.toString() ?? '') ?? DateTime.now(),
      leads: (data['leads'] as List? ?? [])
          .map((l) => RouteStop.fromMap(l as Map<String, dynamic>))
          .toList(),
      travelMode: data['travelMode'] ?? 'DRIVING',
      startPoint: data['startPoint'],
      endPoint: data['endPoint'],
      directions: data['directions'],
      scheduledDate: (data['scheduledDate'] is Timestamp)
          ? (data['scheduledDate'] as Timestamp).toDate()
          : data['scheduledDate'] != null ? DateTime.tryParse(data['scheduledDate'].toString()) : null,
      totalDistance: data['totalDistance'],
      totalDuration: data['totalDuration'],
      isProspectingArea: data['isProspectingArea'] ?? false,
      isUnassigned: data['isUnassigned'] ?? false,
      notes: data['notes'],
      streets: (data['streets'] as List? ?? [])
          .map((s) => RouteStreet.fromMap(s as Map<String, dynamic>))
          .toList(),
      status: data['status'],
      imageUrls: (data['imageUrls'] as List? ?? []).cast<String>(),
      shape: data['shape'] != null ? RouteShape.fromMap(data['shape'] as Map<String, dynamic>) : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'userName': userName,
      'name': name,
      'createdAt': createdAt.toIso8601String(),
      'leads': leads.map((l) => l.toMap()).toList(),
      'travelMode': travelMode,
      'startPoint': startPoint,
      'endPoint': endPoint,
      'directions': directions,
      'scheduledDate': scheduledDate?.toIso8601String(),
      'totalDistance': totalDistance,
      'totalDuration': totalDuration,
      'isProspectingArea': isProspectingArea,
      'isUnassigned': isUnassigned,
      'notes': notes,
      'streets': streets?.map((s) => s.toMap()).toList(),
      'status': status,
      'imageUrls': imageUrls,
      'shape': shape?.toMap(),
    };
  }

  RouteModel copyWith({
    String? id,
    String? userId,
    String? userName,
    String? name,
    DateTime? createdAt,
    List<RouteStop>? leads,
    String? travelMode,
    String? startPoint,
    String? endPoint,
    String? directions,
    DateTime? scheduledDate,
    String? totalDistance,
    String? totalDuration,
    bool? isProspectingArea,
    bool? isUnassigned,
    String? notes,
    List<RouteStreet>? streets,
    String? status,
    List<String>? imageUrls,
    RouteShape? shape,
  }) {
    return RouteModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      leads: leads ?? this.leads,
      travelMode: travelMode ?? this.travelMode,
      startPoint: startPoint ?? this.startPoint,
      endPoint: endPoint ?? this.endPoint,
      directions: directions ?? this.directions,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      totalDistance: totalDistance ?? this.totalDistance,
      totalDuration: totalDuration ?? this.totalDuration,
      isProspectingArea: isProspectingArea ?? this.isProspectingArea,
      isUnassigned: isUnassigned ?? this.isUnassigned,
      notes: notes ?? this.notes,
      streets: streets ?? this.streets,
      status: status ?? this.status,
      imageUrls: imageUrls ?? this.imageUrls,
      shape: shape ?? this.shape,
    );
  }
}

class RouteStop {
  final String id;
  final String companyName;
  final double latitude;
  final double longitude;
  final Map<String, dynamic> address;

  RouteStop({
    required this.id,
    required this.companyName,
    required this.latitude,
    required this.longitude,
    required this.address,
  });

  factory RouteStop.fromMap(Map<String, dynamic> map) {
    double parseCoord(dynamic value) {
      if (value == null) return 0.0;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    return RouteStop(
      id: map['id'] ?? '',
      companyName: map['companyName'] ?? '',
      latitude: parseCoord(map['latitude']),
      longitude: parseCoord(map['longitude']),
      address: Map<String, dynamic>.from(map['address'] ?? {}),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'companyName': companyName,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
    };
  }
}

class RouteStreet {
  final String placeId;
  final String description;
  final double latitude;
  final double longitude;

  RouteStreet({
    required this.placeId,
    required this.description,
    required this.latitude,
    required this.longitude,
  });

  factory RouteStreet.fromMap(Map<String, dynamic> map) {
    double parseCoord(dynamic value) {
      if (value == null) return 0.0;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    return RouteStreet(
      placeId: map['place_id'] ?? '',
      description: map['description'] ?? '',
      latitude: parseCoord(map['latitude']),
      longitude: parseCoord(map['longitude']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'place_id': placeId,
      'description': description,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class RouteShape {
  final String type; // 'polygon' or 'rectangle'
  final List<List<RouteLatLng>>? paths; // For polygon
  final Map<String, double>? bounds; // For rectangle: {north, south, east, west}

  RouteShape({required this.type, this.paths, this.bounds});

  factory RouteShape.fromMap(Map<String, dynamic> map) {
    List<List<RouteLatLng>>? paths;
    if (map['paths'] != null) {
      paths = (map['paths'] as List).map((p) => (p as List).map((l) => RouteLatLng.fromMap(l as Map<String, dynamic>)).toList()).toList();
    }
    
    Map<String, double>? bounds;
    if (map['bounds'] != null) {
      bounds = (map['bounds'] as Map).cast<String, num>().map((k, v) => MapEntry(k, v.toDouble()));
    }

    return RouteShape(
      type: map['type'] ?? 'polygon',
      paths: paths,
      bounds: bounds,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      if (paths != null) 'paths': paths!.map((p) => p.map((l) => l.toMap()).toList()).toList(),
      if (bounds != null) 'bounds': bounds,
    };
  }
}

class RouteLatLng {
  final double lat;
  final double lng;

  RouteLatLng({required this.lat, required this.lng});

  factory RouteLatLng.fromMap(Map<String, dynamic> map) {
    return RouteLatLng(
      lat: (map['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (map['lng'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'lat': lat,
      'lng': lng,
    };
  }
}
