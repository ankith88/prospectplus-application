import 'package:cloud_firestore/cloud_firestore.dart';

class Lead {
  final String id;
  final String companyName;
  final String status;
  final String profile;
  final String? salesRepAssigned;
  final String? dialerAssigned;
  final double? latitude;
  final double? longitude;
  final String? websiteUrl;
  final String? industryCategory;
  final Map<String, dynamic>? address;

  Lead({
    required this.id,
    required this.companyName,
    required this.status,
    required this.profile,
    this.salesRepAssigned,
    this.dialerAssigned,
    this.latitude,
    this.longitude,
    this.websiteUrl,
    this.industryCategory,
    this.address,
  });

  factory Lead.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return Lead(
      id: doc.id,
      companyName: data['companyName'] ?? '',
      status: data['status'] ?? 'New',
      profile: data['profile'] ?? '',
      salesRepAssigned: data['salesRepAssigned'],
      dialerAssigned: data['dialerAssigned'],
      latitude: data['latitude']?.toDouble(),
      longitude: data['longitude']?.toDouble(),
      websiteUrl: data['websiteUrl'],
      industryCategory: data['industryCategory'],
      address: data['address'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'companyName': companyName,
      'status': status,
      'profile': profile,
      'salesRepAssigned': salesRepAssigned,
      'dialerAssigned': dialerAssigned,
      'latitude': latitude,
      'longitude': longitude,
      'websiteUrl': websiteUrl,
      'industryCategory': industryCategory,
      'address': address,
    };
  }
}
