import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:path/path.dart' as path;
import 'package:image_picker/image_picker.dart';

class VisitService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  /// Saves a visit record to the 'visits' collection.
  Future<String> saveVisit(Map<String, dynamic> visitData) async {
    final docRef = await _firestore.collection('visits').add({
      ...visitData,
      'createdAt': FieldValue.serverTimestamp(),
      'status': 'New',
    });
    return docRef.id;
  }

  /// Uploads multiple images to Firebase Storage and returns their download URLs.
  Future<List<String>> uploadVisitImages(String visitId, List<XFile> images) async {
    final List<String> urls = [];
    
    for (int i = 0; i < images.length; i++) {
      final file = File(images[i].path);
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${path.basename(file.path)}';
      final storagePath = 'visits/$visitId/images/$fileName';
      
      final ref = _storage.ref().child(storagePath);
      final uploadTask = await ref.putFile(file);
      final url = await uploadTask.ref.getDownloadURL();
      urls.add(url);
    }
    
    return urls;
  }

  /// Updates a visit record with image URLs.
  Future<void> updateVisitImageUrls(String visitId, List<String> imageUrls) async {
    await _firestore.collection('visits').doc(visitId).update({
      'imageUrls': FieldValue.arrayUnion(imageUrls),
    });
  }
}
