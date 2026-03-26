import 'package:cloud_firestore/cloud_firestore.dart';

class Appointment {
  final String id;
  final String duedate;
  final String starttime;
  final String assignedTo;
  final String? appointmentDate;
  final String? appointmentStatus;
  final bool? revisit;
  final String leadId;
  final String? dialerAssigned;
  final String? leadName;
  final String? leadStatus;
  final String? notes;
  final String type;

  Appointment({
    required this.id,
    required this.duedate,
    required this.starttime,
    required this.assignedTo,
    this.appointmentDate,
    this.appointmentStatus,
    this.revisit,
    required this.leadId,
    this.dialerAssigned,
    this.leadName,
    this.leadStatus,
    this.notes,
    this.type = 'General',
  });

  factory Appointment.fromFirestore(DocumentSnapshot doc, {String? leadName, String? leadStatus}) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    
    String? asString(dynamic value) {
      if (value == null) return null;
      return value.toString();
    }

    return Appointment(
      id: doc.id,
      duedate: asString(data['duedate']) ?? '',
      starttime: asString(data['starttime']) ?? '',
      assignedTo: asString(data['assignedTo']) ?? '',
      appointmentDate: asString(data['appointmentDate']),
      appointmentStatus: asString(data['appointmentStatus']),
      revisit: data['revisit'],
      leadId: asString(data['leadId']) ?? '',
      dialerAssigned: asString(data['dialerAssigned']),
      leadName: leadName,
      leadStatus: leadStatus,
      notes: asString(data['notes']),
      type: asString(data['type'] ?? data['appointmentStatus']) ?? 'General',
    );
  }
}
