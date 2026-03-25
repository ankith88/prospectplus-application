import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/route_model.dart';
import '../models/user_profile.dart';

class RouteService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Fetch routes for a specific user
  Stream<List<RouteModel>> getUserRoutes(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('routes')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => RouteModel.fromFirestore(doc)).toList());
  }

  // Fetch all routes (Admin)
  Stream<List<RouteModel>> getAllUserRoutes() {
    return _db
        .collectionGroup('routes')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => RouteModel.fromFirestore(doc)).toList());
  }

  // Save a new route
  Future<String> saveUserRoute(String userId, RouteModel route) async {
    final docRef = await _db
        .collection('users')
        .doc(userId)
        .collection('routes')
        .add(route.toFirestore());
    return docRef.id;
  }

  // Update an existing route
  Future<void> updateUserRoute(String userId, String routeId, RouteModel route) async {
    return _db
        .collection('users')
        .doc(userId)
        .collection('routes')
        .doc(routeId)
        .update(route.toFirestore());
  }

  // Delete a route
  Future<void> deleteUserRoute(String userId, String routeId) async {
    return _db
        .collection('users')
        .doc(userId)
        .collection('routes')
        .doc(routeId)
        .delete();
  }

  // Fetch all users to map route display names (if needed for filtering)
  Future<List<UserProfile>> getAllUsers() async {
    final snapshot = await _db.collection('users').get();
    return snapshot.docs.map((doc) => UserProfile.fromMap(doc.data(), doc.id)).toList();
  }
}
