import 'package:cloud_firestore/cloud_firestore.dart';

class TranscriptAnalysis {
  final String summary;
  final String sentiment;
  final List<String> actionItems;
  final List<String> keyTopics;

  TranscriptAnalysis({
    required this.summary,
    required this.sentiment,
    required this.actionItems,
    required this.keyTopics,
  });

  factory TranscriptAnalysis.fromMap(Map<String, dynamic> map) {
    return TranscriptAnalysis(
      summary: map['summary'] ?? '',
      sentiment: map['sentiment'] ?? 'Neutral',
      actionItems: List<String>.from(map['actionItems'] ?? []),
      keyTopics: List<String>.from(map['keyTopics'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'summary': summary,
      'sentiment': sentiment,
      'actionItems': actionItems,
      'keyTopics': keyTopics,
    };
  }
}

class Transcript {
  final String id;
  final DateTime date;
  final String author;
  final String content;
  final String callId;
  final String? phoneNumber;
  final TranscriptAnalysis? analysis;

  Transcript({
    required this.id,
    required this.date,
    required this.author,
    required this.content,
    required this.callId,
    this.phoneNumber,
    this.analysis,
  });

  factory Transcript.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Transcript(
      id: doc.id,
      date: DateTime.parse(data['date'] ?? DateTime.now().toIso8601String()),
      author: data['author'] ?? 'Unknown',
      content: data['content'] ?? '[]',
      callId: data['callId'] ?? '',
      phoneNumber: data['phoneNumber'],
      analysis: data['analysis'] != null
          ? TranscriptAnalysis.fromMap(data['analysis'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'date': date.toIso8601String(),
      'author': author,
      'content': content,
      'callId': callId,
      'phoneNumber': phoneNumber,
      'analysis': analysis?.toMap(),
    };
  }
}
