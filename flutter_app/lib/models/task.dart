import 'package:cloud_firestore/cloud_firestore.dart';

class Task {
  final String id;
  final String title;
  final String dueDate;
  final bool isCompleted;
  final String createdAt;
  final String? completedAt;
  final String author;
  final String? dialerAssigned;
  final String? leadId;
  final String? leadName;

  Task({
    required this.id,
    required this.title,
    required this.dueDate,
    this.isCompleted = false,
    required this.createdAt,
    this.completedAt,
    required this.author,
    this.dialerAssigned,
    this.leadId,
    this.leadName,
  });

  factory Task.fromFirestore(DocumentSnapshot doc, {String? leadId, String? leadName}) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return Task(
      id: doc.id,
      title: data['title'] ?? '',
      dueDate: data['dueDate'] ?? '',
      isCompleted: data['isCompleted'] ?? false,
      createdAt: data['createdAt'] ?? '',
      completedAt: data['completedAt'],
      author: data['author'] ?? '',
      dialerAssigned: data['dialerAssigned'],
      leadId: leadId,
      leadName: leadName,
    );
  }
}
