import 'package:cloud_firestore/cloud_firestore.dart';

class Lead {
  final String id;
  final String companyName;
  final String status;
  final String profile;
  final String? entityId;
  final String? internalid;
  final String? franchisee;
  final String? salesRepAssigned;
  final String? dialerAssigned;
  final double? latitude;
  final double? longitude;
  final String? websiteUrl;
  final String? industryCategory;
  final String? industrySubCategory;
  final String? customerServiceEmail;
  final String? customerPhone;
  final List<dynamic>? services;
  final dynamic lastProspected;
  final dynamic dateLeadEntered;
  final String? customerSource;
  final String? visitNoteID;
  final Map<String, dynamic>? address;
  final List<Map<String, dynamic>>? contacts;
  final Map<String, dynamic>? discoveryData;
  final bool? fieldSales;

  // New fields to match web parity
  final String? avatarUrl;
  final String? companyDescription;
  final String? campaign;
  final String? salesRepAssignedCalendlyLink;
  final String? cancellationTheme;
  final String? cancellationCategory;
  final String? cancellationReason;
  final String? cancellationdate;

  Lead({
    required this.id,
    required this.companyName,
    required this.status,
    required this.profile,
    this.entityId,
    this.internalid,
    this.franchisee,
    this.salesRepAssigned,
    this.dialerAssigned,
    this.latitude,
    this.longitude,
    this.websiteUrl,
    this.industryCategory,
    this.industrySubCategory,
    this.customerServiceEmail,
    this.customerPhone,
    this.services,
    this.lastProspected,
    this.dateLeadEntered,
    this.customerSource,
    this.visitNoteID,
    this.address,
    this.contacts,
    this.discoveryData,
    this.fieldSales,
    this.avatarUrl,
    this.companyDescription,
    this.campaign,
    this.salesRepAssignedCalendlyLink,
    this.cancellationTheme,
    this.cancellationCategory,
    this.cancellationReason,
    this.cancellationdate,
  });

  factory Lead.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    double? parseCoord(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    String? asString(dynamic value) {
      if (value == null) return null;
      return value.toString();
    }

    return Lead(
      id: doc.id,
      companyName: asString(data['companyName']) ?? '',
      status: asString(data['status'] ?? data['customerStatus']) ?? 'New',
      profile: asString(data['profile']) ?? '',
      entityId: asString(data['customerEntityId'] ?? data['entityId']),
      internalid: asString(data['internalid'] ?? data['salesRecordInternalId']),
      franchisee: asString(data['franchisee']),
      salesRepAssigned: asString(data['salesRepAssigned']),
      dialerAssigned: asString(data['dialerAssigned']),
      latitude: parseCoord(data['latitude']),
      longitude: parseCoord(data['longitude']),
      websiteUrl: data['websiteUrl'] == 'null' ? null : asString(data['websiteUrl']),
      industryCategory: asString(data['industryCategory']),
      industrySubCategory: asString(data['industrySubCategory']),
      customerServiceEmail: asString(data['customerServiceEmail']),
      customerPhone: asString(data['customerPhone']),
      services: data['services'],
      lastProspected: data['lastProspected'],
      dateLeadEntered: data['dateLeadEntered'],
      customerSource: asString(data['customerSource'] ?? data['source']),
      visitNoteID: asString(data['visitNoteID']),
      address: data['address'],
      contacts: (data['contacts'] as List?)?.map((c) => Map<String, dynamic>.from(c)).toList(),
      discoveryData: data['discoveryData'],
      fieldSales: data['fieldSales'] is bool ? data['fieldSales'] : (data['fieldSales'] == 'true'),
      avatarUrl: asString(data['avatarUrl']),
      companyDescription: asString(data['companyDescription']),
      campaign: asString(data['campaign']),
      salesRepAssignedCalendlyLink: asString(data['salesRepAssignedCalendlyLink']),
      cancellationTheme: asString(data['cancellationTheme']),
      cancellationCategory: asString(data['cancellationCategory']),
      cancellationReason: asString(data['cancellationReason']),
      cancellationdate: asString(data['cancellationdate']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'companyName': companyName,
      'status': status,
      'profile': profile,
      'entityId': entityId,
      'internalid': internalid,
      'franchisee': franchisee,
      'salesRepAssigned': salesRepAssigned,
      'dialerAssigned': dialerAssigned,
      'latitude': latitude,
      'longitude': longitude,
      'websiteUrl': websiteUrl,
      'industryCategory': industryCategory,
      'industrySubCategory': industrySubCategory,
      'customerServiceEmail': customerServiceEmail,
      'customerPhone': customerPhone,
      'services': services,
      'lastProspected': lastProspected,
      'dateLeadEntered': dateLeadEntered,
      'customerSource': customerSource,
      'visitNoteID': visitNoteID,
      'address': address,
      'contacts': contacts,
      'discoveryData': discoveryData,
      'fieldSales': fieldSales,
      'avatarUrl': avatarUrl,
      'companyDescription': companyDescription,
      'campaign': campaign,
      'salesRepAssignedCalendlyLink': salesRepAssignedCalendlyLink,
      'cancellationTheme': cancellationTheme,
      'cancellationCategory': cancellationCategory,
      'cancellationReason': cancellationReason,
      'cancellationdate': cancellationdate,
    };
  }

  Lead copyWith({
    String? status,
    Map<String, dynamic>? discoveryData,
    List<Map<String, dynamic>>? contacts,
    String? avatarUrl,
  }) {
    return Lead(
      id: id,
      companyName: companyName,
      status: status ?? this.status,
      profile: profile,
      entityId: entityId,
      internalid: internalid,
      franchisee: franchisee,
      salesRepAssigned: salesRepAssigned,
      dialerAssigned: dialerAssigned,
      latitude: latitude,
      longitude: longitude,
      websiteUrl: websiteUrl,
      industryCategory: industryCategory,
      industrySubCategory: industrySubCategory,
      customerServiceEmail: customerServiceEmail,
      customerPhone: customerPhone,
      services: services,
      lastProspected: lastProspected,
      dateLeadEntered: dateLeadEntered,
      customerSource: customerSource,
      visitNoteID: visitNoteID,
      address: address,
      contacts: contacts ?? this.contacts,
      discoveryData: discoveryData ?? this.discoveryData,
      fieldSales: fieldSales,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      companyDescription: companyDescription,
      campaign: campaign,
      salesRepAssignedCalendlyLink: salesRepAssignedCalendlyLink,
      cancellationTheme: cancellationTheme,
      cancellationCategory: cancellationCategory,
      cancellationReason: cancellationReason,
      cancellationdate: cancellationdate,
    );
  }
}
