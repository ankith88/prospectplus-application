import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/lead.dart';
import '../models/appointment.dart';
import '../models/task.dart';
import '../models/visit_note.dart';
import '../models/upsell.dart';
import '../models/user_profile.dart';
import '../models/transcript.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  FirebaseFirestore get db => _db;

  Stream<List<Lead>> getLeads({int limit = 1000, String? franchisee}) {
    Query query = _db.collection('leads');
    if (franchisee != null) {
      query = query.where('franchisee', isEqualTo: franchisee);
    }
    return query.limit(limit).snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => Lead.fromFirestore(doc)).toList());
  }

  Future<Lead?> getLeadById(String id) async {
    final doc = await _db.collection('leads').doc(id).get();
    if (!doc.exists) return null;
    return Lead.fromFirestore(doc);
  }

  Future<void> updateLead(Lead lead) {
    return _db.collection('leads').doc(lead.id).update(lead.toMap());
  }

  Future<void> bulkUpdateLeads(List<String> leadIds, Map<String, dynamic> data) async {
    final batch = _db.batch();
    for (var id in leadIds) {
      batch.update(_db.collection('leads').doc(id), data);
    }
    return batch.commit();
  }

  Future<void> bulkDeleteLeads(List<String> leadIds) async {
    final batch = _db.batch();
    for (var id in leadIds) {
      batch.delete(_db.collection('leads').doc(id));
    }
    return batch.commit();
  }

  Future<void> logActivity(String leadId, Map<String, dynamic> activity) {
    return _db.collection('leads').doc(leadId).collection('activity').add({
      ...activity,
      'date': DateTime.now().toIso8601String(),
    });
  }

  Stream<List<Map<String, dynamic>>> getActivities(String id, {bool isCompany = false}) {
    return _db
        .collection(isCompany ? 'companies' : 'leads')
        .doc(id)
        .collection('activity')
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => doc.data()).toList());
  }

  Stream<List<Map<String, dynamic>>> getRecentCheckIns({int limit = 50}) {
    return _db
        .collectionGroup('activity')
        .orderBy('date', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) {
          final data = doc.data();
          final leadId = doc.reference.parent.parent?.id;
          return {
            'id': doc.id,
            'leadId': leadId,
            ...data,
          };
        }).toList());
  }

  Future<String> addVisitNote(Map<String, dynamic> note) async {
    final docRef = await _db.collection('visitnotes').add({
      ...note,
      'createdAt': DateTime.now().toIso8601String(),
      'status': 'New',
    });
    return docRef.id;
  }

  Future<List<VisitNote>> getVisitNotes({String? uid, String? franchiseeId, int limit = 1000}) async {
    Query query = _db.collection('visitnotes');
    if (uid != null) {
      query = query.where('capturedByUid', isEqualTo: uid);
    }
    if (franchiseeId != null) {
      query = query.where('franchisee', isEqualTo: franchiseeId);
    }
    final snapshot = await query.limit(limit).get();
    return snapshot.docs.map((doc) => VisitNote.fromMap(doc.data() as Map<String, dynamic>, doc.id)).toList();
  }

  Future<void> updateVisitNote(String id, Map<String, dynamic> data) async {
    await _db.collection('visitnotes').doc(id).update(data);
  }

  Future<void> deleteVisitNote(String id) async {
    await _db.collection('visitnotes').doc(id).delete();
  }

  // Companies
  Future<List<Lead>> getCompanies({String? franchisee, int limit = 1000}) async {
    Query query = _db.collection('companies');
    if (franchisee != null) {
      query = query.where('franchisee', isEqualTo: franchisee);
    }
    final snapshot = await query.limit(limit).get();
    return snapshot.docs.map((doc) => Lead.fromFirestore(doc)).toList();
  }

  Future<Lead?> getCompany(String id) async {
    final doc = await _db.collection('companies').doc(id).get();
    if (!doc.exists) return null;
    return Lead.fromFirestore(doc);
  }

  Future<List<Map<String, dynamic>>> getInvoices(String companyId) async {
    final snapshot = await _db
        .collection('companies')
        .doc(companyId)
        .collection('invoices')
        .orderBy('invoiceDate', descending: true)
        .get();
    return snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList();
  }

  Future<void> logUpsell(Map<String, dynamic> upsellData) async {
    await _db.collection('upsells').add({
      ...upsellData,
      'createdAt': FieldValue.serverTimestamp(),
    });
    // Also log as activity for the company
    await logCompanyActivity(upsellData['companyId'], {
      'type': 'Upsell',
      'notes': 'Upsell recorded: ${upsellData['notes']}',
      'author': upsellData['repName'],
      'date': DateTime.now().toIso8601String(),
    });
  }

  Future<void> logCompanyActivity(String companyId, Map<String, dynamic> activityData) async {
    await _db.collection('companies').doc(companyId).collection('activity').add(activityData);
  }

  // Appointments
  Future<List<Appointment>> getAllAppointments() async {
    final snapshot = await _db.collectionGroup('appointments').get();
    if (snapshot.docs.isEmpty) return [];

    // Extract unique lead IDs
    final leadIds = snapshot.docs
        .map((doc) => doc.reference.parent.parent?.id)
        .whereType<String>()
        .toSet()
        .toList();

    // Fetch leads and companies in chunks
    final Map<String, Map<String, dynamic>> entitiesData = {};
    for (var i = 0; i < leadIds.length; i += 10) {
      final chunk = leadIds.sublist(i, i + 10 > leadIds.length ? leadIds.length : i + 10);
      
      // Check leads
      final leadsSnapshot = await _db
          .collection('leads')
          .where(FieldPath.documentId, whereIn: chunk)
          .get();
      for (var doc in leadsSnapshot.docs) {
        entitiesData[doc.id] = doc.data();
      }

      // Check companies for any not found in leads
      final remainingIds = chunk.where((id) => !entitiesData.containsKey(id)).toList();
      if (remainingIds.isNotEmpty) {
        final companiesSnapshot = await _db
            .collection('companies')
            .where(FieldPath.documentId, whereIn: remainingIds)
            .get();
        for (var doc in companiesSnapshot.docs) {
          entitiesData[doc.id] = doc.data();
        }
      }
    }

    return snapshot.docs.map((doc) {
      final leadId = doc.reference.parent.parent?.id ?? '';
      final entity = entitiesData[leadId];
      return Appointment.fromFirestore(
        doc,
        leadName: entity?['companyName']?.toString() ?? 'Unknown Lead',
        leadStatus: entity?['customerStatus']?.toString() ?? (entity != null ? 'Won' : 'New'),
      );
    }).toList()
      ..sort((a, b) => a.duedate.compareTo(b.duedate));
  }

  Future<List<Appointment>> getAppointmentsByUser(String displayName) async {
    final all = await getAllAppointments();
    if (displayName == 'All') return all;
    return all.where((a) => a.assignedTo == displayName).toList();
  }

  // Tasks
  Future<List<Task>> getAllUserTasks(String displayName) async {
    final snapshot = await _db
        .collectionGroup('tasks')
        .where('dialerAssigned', isEqualTo: displayName)
        .get();
    if (snapshot.docs.isEmpty) return [];

    final leadIds = snapshot.docs
        .map((doc) => doc.reference.parent.parent?.id)
        .whereType<String>()
        .toSet()
        .toList();

    final Map<String, Map<String, dynamic>> leadsData = {};
    for (var i = 0; i < leadIds.length; i += 10) {
      final chunk = leadIds.sublist(i, i + 10 > leadIds.length ? leadIds.length : i + 10);
      final leadsSnapshot = await _db
          .collection('leads')
          .where(FieldPath.documentId, whereIn: chunk)
          .get();
      for (var doc in leadsSnapshot.docs) {
        leadsData[doc.id] = doc.data();
      }
    }

    return snapshot.docs.map((doc) {
      final leadId = doc.reference.parent.parent?.id ?? '';
      final lead = leadsData[leadId];
      return Task.fromFirestore(
        doc,
        leadId: leadId,
        leadName: lead?['companyName'] ?? 'Unknown Lead',
      );
    }).toList();
  }

  Future<void> updateTaskCompletion(String id, String taskId, bool isCompleted, {bool isCompany = false}) async {
    await _db
        .collection(isCompany ? 'companies' : 'leads')
        .doc(id)
        .collection('tasks')
        .doc(taskId)
        .update({
      'isCompleted': isCompleted,
      'completedAt': isCompleted ? DateTime.now().toIso8601String() : null,
    });
  }

  Future<void> addTask(String id, Map<String, dynamic> taskData, {bool isCompany = false}) async {
    await _db
        .collection(isCompany ? 'companies' : 'leads')
        .doc(id)
        .collection('tasks')
        .add({
      ...taskData,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  Future<void> addAppointment(String id, Map<String, dynamic> apptData, {bool isCompany = false}) async {
    await _db
        .collection(isCompany ? 'companies' : 'leads')
        .doc(id)
        .collection('appointments')
        .add({
      ...apptData,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  Future<void> addAppointmentToLead(String leadId, Map<String, dynamic> apptData) async {
    await _db
        .collection('leads')
        .doc(leadId)
        .collection('appointments')
        .add({
      ...apptData,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  Future<void> deleteTaskFromLead(String leadId, String taskId) async {
    await _db
        .collection('leads')
        .doc(leadId)
        .collection('tasks')
        .doc(taskId)
        .delete();
  }


  Future<List<Upsell>> getUpsells() async {
    final snapshot = await _db.collection('upsells').get();
    return snapshot.docs.map((doc) => Upsell.fromMap(doc.data(), doc.id)).toList();
  }

  Future<List<UserProfile>> getAllUsers() async {
    final snapshot = await _db.collection('users').get();
    return snapshot.docs.map((doc) => UserProfile.fromMap(doc.data(), doc.id)).toList();
  }

  Future<List<Lead>> getAllLeadsForReport() async {
    final snapshot = await _db.collection('leads').get();
    return snapshot.docs.map((doc) => Lead.fromFirestore(doc)).toList();
  }

  Future<List<Map<String, dynamic>>> getAllActivities() async {
    final snapshot = await _db.collectionGroup('activity').get();
    return snapshot.docs.map((doc) => {
      'id': doc.id,
      'leadId': doc.reference.parent.parent?.id,
      ...doc.data()
    }).toList();
  }

  Future<List<Lead>> getOutboundLeads({String? franchisee}) async {
    // We use whereNotIn to exclude common archived statuses at the source.
    // Note: Won/Signed are excluded here to ensure Signed customers don't show up.
    // "Lost Customer" is also excluded as requested.
    final excludedStatuses = ['Won', 'Signed', 'Lost Customer', 'Lost', 'Qualified', 'Unqualified'];
    
    Query query = _db.collection('leads')
        .where('customerStatus', whereNotIn: excludedStatuses);
    
    if (franchisee != null) {
      query = query.where('franchisee', isEqualTo: franchisee);
    }
    
    final snapshot = await query.get();
    return snapshot.docs.map((doc) => Lead.fromFirestore(doc)).toList();
  }

  Future<List<Lead>> getCombinedLeads() async {
    final results = await Future.wait([
      _db.collection('leads').get(),
      _db.collection('companies').get(),
    ]);

    final leads = results[0].docs.map((doc) => Lead.fromFirestore(doc)).toList();
    final companies = results[1].docs.map((doc) => Lead.fromFirestore(doc)).toList();
    
    return [...leads, ...companies];
  }

  // Transcripts
  Future<List<Transcript>> getAllTranscripts() async {
    final snapshot = await _db
        .collection('transcripts')
        .orderBy('date', descending: true)
        .get();
    return snapshot.docs.map((doc) => Transcript.fromFirestore(doc)).toList();
  }

  Future<List<Lead>> getLeadsByStatus(List<String> statuses) async {
    final snapshot = await _db
        .collection('leads')
        .where('status', whereIn: statuses)
        .get();
    return snapshot.docs.map((doc) => Lead.fromFirestore(doc)).toList();
  }

  Future<void> updateLeadData(String id, Map<String, dynamic> data) async {
    await _db.collection('leads').doc(id).update(data);
  }

  Future<void> updateCompanyData(String id, Map<String, dynamic> data) async {
    await _db.collection('companies').doc(id).update(data);
  }

  Future<String?> checkForDuplicateLead({
    required String companyName,
    String? websiteUrl,
    String? email,
  }) async {
    // 1. Check Leads Collection
    Query nameQuery = _db.collection('leads').where('companyName', isEqualTo: companyName);
    final nameSnap = await nameQuery.limit(1).get();
    if (nameSnap.docs.isNotEmpty) return nameSnap.docs.first.id;

    if (websiteUrl != null && websiteUrl.isNotEmpty) {
      final webSnap = await _db.collection('leads').where('websiteUrl', isEqualTo: websiteUrl).limit(1).get();
      if (webSnap.docs.isNotEmpty) return webSnap.docs.first.id;
    }

    if (email != null && email.isNotEmpty) {
      final emailSnap = await _db.collection('leads').where('customerServiceEmail', isEqualTo: email).limit(1).get();
      if (emailSnap.docs.isNotEmpty) return emailSnap.docs.first.id;
    }

    // 2. Check Companies Collection
    Query compNameQuery = _db.collection('companies').where('companyName', isEqualTo: companyName);
    final compNameSnap = await compNameQuery.limit(1).get();
    if (compNameSnap.docs.isNotEmpty) return compNameSnap.docs.first.id;

    if (websiteUrl != null && websiteUrl.isNotEmpty) {
      final compWebSnap = await _db.collection('companies').where('websiteUrl', isEqualTo: websiteUrl).limit(1).get();
      if (compWebSnap.docs.isNotEmpty) return compWebSnap.docs.first.id;
    }

    if (email != null && email.isNotEmpty) {
      final compEmailSnap = await _db.collection('companies').where('customerServiceEmail', isEqualTo: email).limit(1).get();
      if (compEmailSnap.docs.isNotEmpty) return compEmailSnap.docs.first.id;
    }

    return null;
  }

  String formatDiscoveryData(Map<String, dynamic>? discoveryData) {
    if (discoveryData == null || discoveryData.isEmpty) return '';
    return discoveryData.entries.map((e) {
      final key = e.key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}').replaceFirstMapped(RegExp(r'^.'), (m) => m.group(0)!.toUpperCase());
      final value = e.value is List ? (e.value as List).join(', ') : e.value.toString();
      return '$key: $value';
    }).where((s) => s.isNotEmpty).join('\n');
  }

  Future<List<Map<String, dynamic>>> getVisitNotesRaw() async {
    final snapshot = await _db.collection('visitnotes').get();
    return snapshot.docs.map((doc) => {...doc.data(), 'id': doc.id}).toList();
  }

  Future<List<Map<String, dynamic>>> getAllUsersRaw() async {
    final snapshot = await _db.collection('users').get();
    return snapshot.docs.map((doc) => doc.data()).toList();
  }
}
