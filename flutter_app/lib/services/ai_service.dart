import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/lead.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';

class AiService {
  final GenerativeModel _model;

  AiService(String apiKey)
      : _model = GenerativeModel(
          model: 'gemini-1.5-flash',
          apiKey: apiKey,
        );

  Future<Map<String, dynamic>?> scoreLead(Lead lead) async {
    final prompt = '''
You are an AI assistant for ProspectPlus, an application powered by MailPlus, an express parcel delivery service. Your goal is to score a sales lead for cold calling. The target service is **next-day delivery for parcels from 1kg to 20kg within Australia.**

Analyze the lead's information to determine how likely they are to need this specific service.

- Give a higher score (75-100) to companies whose business model clearly involves shipping parcels within our target weight range and exclusively within Australia (e.g., e-commerce stores selling consumer goods, online retailers, parts distributors, specialty food producers).
- Increase the score if you find keywords like "nationwide shipping", "ships Australia-wide", "express post", "delivery partners", "request a quote", "shipping policy".
- Decrease the score for companies that likely ship very heavy items (e.g., "freight", "heavy machinery"), ship internationally, or sell digital-only products/services (e.g., "digital downloads", "software as a service", "consulting").

Provide a reason for the assigned score, highlighting the key factors that influenced your assessment.

Lead ID: ${lead.id}
Company: ${lead.companyName}
Industry: ${lead.industryCategory}
Profile: ${lead.profile}
Website: ${lead.websiteUrl}

Return your response as a JSON object with 'score' (number) and 'reason' (string).
''';

    try {
      final response = await _model.generateContent([Content.text(prompt)]);
      final text = response.text;
      if (text == null) return null;

      final jsonStart = text.indexOf('{');
      final jsonEnd = text.lastIndexOf('}');
      if (jsonStart != -1 && jsonEnd != -1) {
        final jsonStr = text.substring(jsonStart, jsonEnd + 1);
        return {'raw': jsonStr}; 
      }
    } catch (e) {
      debugPrint('AI Scoring error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> prospectWebsite(String url) async {
    final prompt = '''
Analyze the following website and extract contact information for key personnel (decision makers, managers, or owners).
Website URL: $url

Return the results as a JSON object with a list of 'contacts', where each contact has 'name', 'title', 'email', and 'phone'.
If no specific contacts are found, return an empty list.
''';

    try {
      final response = await _model.generateContent([Content.text(prompt)]);
      final text = response.text;
      if (text == null) return null;

      final jsonStart = text.indexOf('{');
      final jsonEnd = text.lastIndexOf('}');
      if (jsonStart != -1 && jsonEnd != -1) {
        final jsonStr = text.substring(jsonStart, jsonEnd + 1);
        return json.decode(jsonStr);
      }
    } catch (e) {
      debugPrint('AI Prospecting error: $e');
    }
    return null;
  }
}
