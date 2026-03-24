import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/lead.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<List<Lead>> getLeads() {
    return _db.collection('leads').snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => Lead.fromFirestore(doc)).toList());
  }

  Future<void> updateLead(Lead lead) {
    return _db.collection('leads').doc(lead.id).update(lead.toMap());
  }

  Future<void> logActivity(String leadId, Map<String, dynamic> activity) {
    return _db.collection('leads').doc(leadId).collection('activity').add({
      ...activity,
      'date': DateTime.now().toIso8601String(),
    });
  }

  Stream<List<Map<String, dynamic>>> getActivities(String leadId) {
    return _db
        .collection('leads')
        .doc(leadId)
        .collection('activity')
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => doc.data()).toList());
  }
}
