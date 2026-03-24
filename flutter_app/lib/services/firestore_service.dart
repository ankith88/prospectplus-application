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

  Future<Lead?> getLead(String id) async {
    final doc = await _db.collection('leads').doc(id).get();
    if (doc.exists) {
      return Lead.fromFirestore(doc);
    }
    return null;
  }
}
