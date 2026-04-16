import 'package:http/http.dart' as http;
import 'dart:convert';

class NetSuiteService {
  static const String _baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
  static const String _compId = "1048144";

  // Existing methods...

  Future<Map<String, dynamic>> sendVisitNote({
    required String capturedBy,
    required String outcome,
    required String companyName,
    required String discoveryAnswers,
  }) async {
    final queryParameters = {
      'script': '2413',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQK8u56Yfz3hNds2mmrb8a8jPUIwnuq-0CGJEHr1ygdt8',
      'capturedBy': capturedBy,
      'outcome': outcome,
      'companyName': companyName,
      'discoveryAnswers': discoveryAnswers.isNotEmpty ? discoveryAnswers : 'No discovery data provided.',
    };

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);

    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendNewLead({
    required String companyName,
    String? websiteUrl,
    String? customerPhone,
    String? customerServiceEmail,
    String? abn,
    String? industryCategory,
    String? campaign,
    required Map<String, dynamic> address,
    required Map<String, dynamic> contact,
    String? initialNotes,
    String? dialerAssigned,
    String? salesRepAssigned,
    String? discoveryString,
    String? visitNoteID,
  }) async {
    final Map<String, String> queryParameters = {
      'script': '2194',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQ6MIVXCrzpiLKSEmYLRVtAlRSAOWEC4Dyr1D-_83sS4g',
      'companyname': companyName,
    };

    if (websiteUrl != null && websiteUrl.isNotEmpty) queryParameters['website'] = websiteUrl;
    if (customerPhone != null && customerPhone.isNotEmpty) queryParameters['phone'] = customerPhone;
    if (customerServiceEmail != null && customerServiceEmail.isNotEmpty) queryParameters['email'] = customerServiceEmail;
    if (abn != null && abn.isNotEmpty) queryParameters['custentity_abn'] = abn;
    if (industryCategory != null && industryCategory.isNotEmpty) queryParameters['category'] = industryCategory;
    if (campaign != null && campaign.isNotEmpty) queryParameters['custentity_leadsource'] = campaign;

    queryParameters['billaddr1'] = address['street'] ?? '';
    queryParameters['billcity'] = address['city'] ?? '';
    queryParameters['billstate'] = address['state'] ?? '';
    queryParameters['billzip'] = address['zip'] ?? '';
    queryParameters['billcountry'] = address['country'] ?? 'Australia';
    
    if (address['address1'] != null && address['address1'].isNotEmpty) {
      queryParameters['billaddr2'] = address['address1'];
    }
    if (address['lat'] != null) queryParameters['custentity_addr_lat'] = address['lat'].toString();
    if (address['lng'] != null) queryParameters['custentity_addr_long'] = address['lng'].toString();

    final String fullName = '${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''}'.trim();
    if (fullName.isNotEmpty) queryParameters['custentity_primary_contact_name'] = fullName;
    queryParameters['custentity_primary_contact_title'] = contact['title'] ?? '';
    queryParameters['custentity_primary_contact_email'] = contact['email'] ?? '';
    queryParameters['custentity_primary_contact_phone'] = contact['phone'] ?? '';

    if (initialNotes != null && initialNotes.isNotEmpty) queryParameters['custentity_initial_notes'] = initialNotes;
    if (dialerAssigned != null && dialerAssigned.isNotEmpty) queryParameters['custentity_dialer'] = dialerAssigned;
    if (salesRepAssigned != null && salesRepAssigned.isNotEmpty) queryParameters['salesrep'] = salesRepAssigned;
    if (discoveryString != null && discoveryString.isNotEmpty) queryParameters['custentity_checkin_questions'] = discoveryString;
    if (visitNoteID != null && visitNoteID.isNotEmpty) queryParameters['custentity_visit_note_id'] = visitNoteID;

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);

    try {
      final response = await http.get(uri);
      return _handleResponse(response, isNewLead: true);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // --- New Methods to Mirror Web Parity ---

  Future<Map<String, dynamic>> sendOutcome({
    required String leadId,
    required String outcome,
    required String reason,
    required String dialerAssigned,
    required String notes,
    String? salesRecordInternalId,
  }) async {
    String nsAt = "AAEJ7tMQrXaUiyrcK7JhiN0lUSv9b2uOL2FluSjbC6Z3EMXV3Qs"; // Default (Deploy 1)
    String deploy = "1";

    if (dialerAssigned == 'Lachlan Ball') {
      nsAt = "AAEJ7tMQnNZU_8ydzRGGa5ahHvXzSQtFIXRXuSENy7Y5LfPM2sc";
      deploy = "2";
    } else if (dialerAssigned == 'Lalaine Revilla') {
      nsAt = "AAEJ7tMQtjnGS0_7N6bf6_oVhlxLQscg10d91PP0UkV_be_flEM";
      deploy = "3";
    } else if (dialerAssigned == 'Elmarez Guerrero') {
      nsAt = "AAEJ7tMQGegW2NQZA9xEft6BpUWOFwrRkxCBqe05kNbxzzveErU";
      deploy = "4";
    }

    final queryParameters = {
      'script': '2156',
      'deploy': deploy,
      'compid': _compId,
      'ns-at': nsAt,
      'leadID': leadId,
      'outcome': outcome,
      'reason': reason,
      'dialerAssigned': dialerAssigned,
      'notes': notes,
    };
    if (salesRecordInternalId != null) queryParameters['salesrecordid'] = salesRecordInternalId;

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendDiscoveryData({
    required String leadId,
    required Map<String, dynamic> discoveryData,
  }) async {
    final queryParameters = {
      'script': '2161',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQ0npCZCvJuVUBGGvoJjWTgPUWIKy4vZfFXJJ2pOutWQo',
      'leadID': leadId,
    };

    discoveryData.forEach((key, value) {
      if (value != null) {
        if (value is List) {
          if (value.isNotEmpty) queryParameters[key] = value.join(',');
        } else {
          queryParameters[key] = value.toString();
        }
      }
    });

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendContactUpdate({
    required String leadId,
    required String contactId,
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String title,
  }) async {
    final queryParameters = {
      'script': '2162',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQiABijVECkP4VMN5S4EQRn4vSKQ0EnMiG99-nTlSJ1ck',
      'leadID': leadId,
      'contactid': contactId,
      'firstname': firstName,
      'lastname': lastName,
      'email': email,
      'phone': phone,
      'title': title,
    };

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendNote({
    required String leadId,
    required String noteId,
    required String author,
    required String content,
  }) async {
    String nsAt = "AAEJ7tMQv82BUnS0O7ggE-shiuIVD0iRQJbU_RdY_87W2N0W3lw"; // Default
    String deploy = "1";

    if (author == 'Lachlan Ball') {
      nsAt = "AAEJ7tMQifr1Zy5ZAH7_XU99qvbnccxk_8zzRdRA0tTNuiZ1c4U";
      deploy = "2";
    } else if (author == 'Lalaine Revilla') {
      nsAt = "AAEJ7tMQFFIRCUzYAfnhpgPpDPcn8IxetvArSVKqte6lc-Oo9wU";
      deploy = "3";
    } else if (author == 'Elmarez Guerrero') {
      nsAt = "AAEJ7tMQBSNXuoMj6A0jNf6iUisGtdzB5tPq0z95mU7EFjmfJA0";
      deploy = "4";
    }

    final queryParameters = {
      'script': '2163',
      'deploy': deploy,
      'compid': _compId,
      'ns-at': nsAt,
      'leadID': leadId,
      'noteID': noteId,
      'author': author,
      'content': content,
    };

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendActivity({
    required String leadId,
    String? callId,
    String? date,
    String? author,
    String? notes,
    String? duration,
    String? type,
  }) async {
    final queryParameters = {
      'script': '2164',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQL_ftCT5OvCNWt6p0ldSNIXUd_vy0qXfpYpz8kfRPOt4',
      'leadID': leadId,
    };
    if (callId != null) queryParameters['callID'] = callId;
    if (date != null) queryParameters['date'] = date;
    if (author != null) queryParameters['author'] = author;
    if (notes != null) queryParameters['notes'] = notes;
    if (duration != null) queryParameters['duration'] = duration;
    if (type != null) queryParameters['type'] = type;

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendLeadUpdate({
    required String leadId,
    String? companyName,
    String? email,
    String? phone,
    String? website,
    String? industry,
    Map<String, dynamic>? address,
  }) async {
    final queryParameters = {
      'script': '2165',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQjAoBac5NMovu7TgzYYUBTkw80-MtaJaID2gsRUcr0hs',
      'leadID': leadId,
    };
    if (companyName != null) queryParameters['companyname'] = companyName;
    if (email != null) queryParameters['email'] = email;
    if (phone != null) queryParameters['phone'] = phone;
    if (website != null) queryParameters['website'] = website;
    if (industry != null) queryParameters['category'] = industry;
    
    if (address != null) {
      if (address['address1'] != null) queryParameters['address1'] = address['address1'];
      if (address['street'] != null) queryParameters['addr1'] = address['street'];
      if (address['city'] != null) queryParameters['city'] = address['city'];
      if (address['state'] != null) queryParameters['state'] = address['state'];
      if (address['zip'] != null) queryParameters['zip'] = address['zip'];
      if (address['country'] != null) queryParameters['country'] = address['country'];
    }

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> initiateLocalMileTrial(String leadId) async {
    final queryParameters = {
      'script': '2304',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQPtx-RkoehGdU54hU1SkptG6L_wpHYmV3FO0CiK9SmdQ',
      'leadId': leadId,
    };
    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> initiateMPProductsTrial(String leadId) async {
    final queryParameters = {
      'script': '2305',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQGhcXcO8gwnMwT4vWb1ED9y9xolecXh_KeGO0Kgg9u5c',
      'leadId': leadId,
    };
    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendUpsellNotification({
    required String companyId,
    required String repName,
    required String notes,
  }) async {
    final queryParameters = {
      'script': '2515',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQJXuVOabq_AMsOif5cbeVcJpldzCqTnbRjZjUM8DtnMo',
      'leadId': companyId,
      'repName': repName,
      'notes': notes,
    };
    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendDeployment({
    required String userId,
    required String userName,
    required String displayName,
    required String email,
    required String area,
    required String startTime,
    required String date,
  }) async {
    final queryParameters = {
      'script': '2521',
      'deploy': '1',
      'compid': _compId,
      'ns-at': 'AAEJ7tMQCF0Mu-VvsG7iHzPGS_bXpGZgrYSmFxjVxo7AXy7uSCs',
      'userId': userId,
      'userName': userName,
      'displayName': displayName,
      'email': email,
      'area': area,
      'startTime': startTime,
      'date': date,
    };

    final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParameters);
    try {
      final response = await http.get(uri);
      return _handleResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // --- Helper Methods ---

  Map<String, dynamic> _handleResponse(http.Response response, {bool isNewLead = false}) {
    if (response.statusCode == 200) {
      final responseText = response.body;
      if (responseText.trim() == '1' || responseText.toLowerCase().contains('success')) {
        return {'success': true, 'message': 'Sync successful.'};
      }
      try {
        final decoded = json.decode(responseText);
        if (isNewLead) {
          return {
            'success': decoded['success'] == true,
            'leadId': decoded['leadID']?.toString(),
            'message': decoded['message'] ?? 'Action completed.',
          };
        }
        return decoded;
      } catch (e) {
        return {'success': true, 'message': 'Sync initiated. Raw response: $responseText'};
      }
    } else {
      return {
        'success': false,
        'message': 'NetSuite API request failed with status ${response.statusCode}.',
      };
    }
  }
}
