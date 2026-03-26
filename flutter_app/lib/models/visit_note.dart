import 'package:cloud_firestore/cloud_firestore.dart';
import 'address.dart';

class VisitNote {
  final String id;
  final String content;
  final String capturedBy;
  final String capturedByUid;
  final String? franchisee;
  final List<String> imageUrls;
  final String? googlePlaceId;
  final String? companyName;
  final Address? address;
  final String? websiteUrl;
  final Map<String, dynamic> outcome;
  final Map<String, dynamic> discoveryData;
  final DateTime createdAt;
  final String? status;
  final String? leadId;
  final String? scheduledDate;
  final String? scheduledTime;

  VisitNote({
    required this.id,
    required this.content,
    required this.capturedBy,
    required this.capturedByUid,
    this.franchisee,
    this.imageUrls = const [],
    this.googlePlaceId,
    this.companyName,
    this.address,
    this.websiteUrl,
    required this.outcome,
    required this.discoveryData,
    required this.createdAt,
    this.status,
    this.leadId,
    this.scheduledDate,
    this.scheduledTime,
  });

  factory VisitNote.fromMap(Map<String, dynamic> data, String id) {
    String? asString(dynamic value) {
      if (value == null) return null;
      return value.toString();
    }

    dynamic rawOutcome = data['outcome'];
    Map<String, dynamic> parsedOutcome;
    if (rawOutcome is Map) {
      parsedOutcome = Map<String, dynamic>.from(rawOutcome);
    } else if (rawOutcome is String) {
      parsedOutcome = {'type': rawOutcome};
    } else {
      parsedOutcome = {};
    }

    DateTime parsedCreatedAt;
    if (data['createdAt'] is Timestamp) {
      parsedCreatedAt = (data['createdAt'] as Timestamp).toDate();
    } else if (data['createdAt'] is String) {
      parsedCreatedAt = DateTime.parse(data['createdAt']);
    } else {
      parsedCreatedAt = DateTime.now();
    }

    return VisitNote(
      id: id,
      content: asString(data['content']) ?? '',
      capturedBy: asString(data['capturedBy']) ?? '',
      capturedByUid: asString(data['capturedByUid']) ?? '',
      franchisee: asString(data['franchisee']),
      imageUrls: List<String>.from(data['imageUrls'] ?? []),
      googlePlaceId: asString(data['googlePlaceId']),
      companyName: asString(data['companyName']),
      address: data['address'] != null ? Address.fromMap(data['address']) : null,
      websiteUrl: asString(data['websiteUrl']),
      outcome: parsedOutcome,
      discoveryData: Map<String, dynamic>.from(data['discoveryData'] ?? {}),
      createdAt: parsedCreatedAt,
      status: asString(data['status']),
      leadId: asString(data['leadId']),
      scheduledDate: asString(data['scheduledDate']),
      scheduledTime: asString(data['scheduledTime']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'content': content,
      'capturedBy': capturedBy,
      'capturedByUid': capturedByUid,
      'franchisee': franchisee,
      'imageUrls': imageUrls,
      'googlePlaceId': googlePlaceId,
      'companyName': companyName,
      'address': address?.toMap(),
      'websiteUrl': websiteUrl,
      'outcome': outcome,
      'discoveryData': discoveryData,
      'createdAt': createdAt.toIso8601String(),
      'status': status,
      'leadId': leadId,
      'scheduledDate': scheduledDate,
      'scheduledTime': scheduledTime,
    };
  }
}
