import 'package:http/http.dart' as http;
import 'dart:convert';

class NetSuiteService {
  static const String _baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
  static const String _script = "2413";
  static const String _deploy = "1";
  static const String _compId = "1048144";
  static const String _nsAt = "AAEJ7tMQK8u56Yfz3hNds2mmrb8a8jPUIwnuq-0CGJEHr1ygdt8";

  Future<Map<String, dynamic>> sendVisitNote({
    required String capturedBy,
    required String outcome,
    required String companyName,
    required String discoveryAnswers,
  }) async {
    final queryParameters = {
      'script': _script,
      'deploy': _deploy,
      'compid': _compId,
      'ns-at': _nsAt,
      'capturedBy': capturedBy,
      'outcome': outcome,
      'companyName': companyName,
      'discoveryAnswers': discoveryAnswers.isNotEmpty ? discoveryAnswers : 'No discovery data provided.',
    };

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);

    try {
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final responseText = response.body;
        
        if (responseText.trim() == '1' || responseText.toLowerCase().contains('success')) {
          return {'success': true, 'message': 'Sync successful.'};
        }

        try {
          return json.decode(responseText);
        } catch (e) {
          return {'success': true, 'message': 'Sync initiated. Raw response: $responseText'};
        }
      } else {
        return {
          'success': false,
          'message': 'NetSuite API request failed with status ${response.statusCode}.',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'An unexpected error occurred: ${e.toString()}',
      };
    }
  }
}
