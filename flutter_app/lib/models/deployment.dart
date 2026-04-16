import 'package:cloud_firestore/cloud_firestore.dart';

class Deployment {
  final String? id;
  final String userId;
  final String userName;
  final String date; // YYYY-MM-DD (typically Australia/Sydney)
  final String area;
  final String startTime;

  Deployment({
    this.id,
    required this.userId,
    required this.userName,
    required this.date,
    required this.area,
    required this.startTime,
  });

  factory Deployment.fromMap(Map<String, dynamic> data, String id) {
    return Deployment(
      id: id,
      userId: data['userId'] ?? '',
      userName: data['userName'] ?? '',
      date: data['date'] ?? '',
      area: data['area'] ?? '',
      startTime: data['startTime'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'date': date,
      'area': area,
      'startTime': startTime,
      'createdAt': FieldValue.serverTimestamp(),
    };
  }

  factory Deployment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Deployment.fromMap(data, doc.id);
  }
}
