import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../models/visit_note.dart';
import '../../services/firestore_service.dart';
import '../../services/netsuite_service.dart';
import '../../services/google_places_service.dart';
import '../../services/speech_service.dart';
import '../../services/ai_service.dart';
import '../../services/auth_service.dart';
import '../../models/user_profile.dart';
import '../../theme/app_theme.dart';
import '../../widgets/layout/main_layout.dart';

class NewLeadScreen extends StatefulWidget {
  final String? fromVisitNoteId;
  const NewLeadScreen({super.key, this.fromVisitNoteId});

  @override
  State<NewLeadScreen> createState() => _NewLeadScreenState();
}

class _NewLeadScreenState extends State<NewLeadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _companySearchController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _websiteUrlController = TextEditingController();
  final _customerPhoneController = TextEditingController();
  final _customerEmailController = TextEditingController();
  final _abnController = TextEditingController();
  final _industryController = TextEditingController();
  final _salesRepController = TextEditingController();
  final _campaignController = TextEditingController();
  
  final _address1Controller = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _zipController = TextEditingController();
  final _countryController = TextEditingController(text: 'Australia');

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _titleController = TextEditingController(text: 'Primary Contact');
  final _contactEmailController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  
  final _initialNotesController = TextEditingController();

  late final GooglePlacesService _placesService;
  late final SpeechService _speechService = SpeechService();
  late final AiService _aiService;
  
  List<Map<String, dynamic>> _placePredictions = [];
  bool _isSearching = false;
  bool _isSubmitting = false;
  bool _isAiProspecting = false;
  bool _isListening = false;
  
  VisitNote? _sourceVisitNote;
  UserProfile? _currentUser;
  String? _duplicateLeadId;
  
  final List<String> _industryCategories = [
    'Retail',
    'E-commerce',
    'Manufacturing',
    'Wholesale',
    'Business Services',
    'Healthcare',
    'Hospitality',
    'Other'
  ];

  final List<String> _campaigns = ['Outbound', 'Door-to-Door'];

  @override
  void initState() {
    super.initState();
    final apiKey = dotenv.get('GOOGLE_MAPS_API_KEY');
    _placesService = GooglePlacesService(apiKey);
    _aiService = AiService(apiKey); // Reusing GMaps key for Gemini if that's the setup, or use another key
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final firestoreService = Provider.of<FirestoreService>(context, listen: false);
    final authService = Provider.of<AuthService>(context, listen: false);
    
    _currentUser = await authService.getUserProfile(authService.currentUser?.uid ?? '');
    
    if (widget.fromVisitNoteId != null) {
      final notes = await firestoreService.getVisitNotes();
      _sourceVisitNote = notes.firstWhere((n) => n.id == widget.fromVisitNoteId);
      if (_sourceVisitNote != null) {
        _populateFromVisitNote(_sourceVisitNote!);
      }
    }
    
    if (mounted) setState(() {});
  }

  void _populateFromVisitNote(VisitNote note) {
    _companyNameController.text = note.companyName ?? '';
    _companySearchController.text = note.companyName ?? '';
    _streetController.text = note.address?.street ?? '';
    _cityController.text = note.address?.city ?? '';
    _stateController.text = note.address?.state ?? '';
    _zipController.text = note.address?.zip ?? '';
    _address1Controller.text = note.address?.address1 ?? '';
    
    _initialNotesController.text = note.content;
    
    // Attempt to parse contact info from outcome or discovery
    if (note.discoveryData['decisionMakerName'] != null) {
      final names = note.discoveryData['decisionMakerName'].toString().split(' ');
      _firstNameController.text = names.isNotEmpty ? names[0] : '';
      _lastNameController.text = names.length > 1 ? names.sublist(1).join(' ') : '';
      _titleController.text = note.discoveryData['decisionMakerTitle'] ?? 'Decision Maker';
      _contactEmailController.text = note.discoveryData['decisionMakerEmail'] ?? '';
      _contactPhoneController.text = note.discoveryData['decisionMakerPhone'] ?? '';
    } else if (note.outcome['contactName'] != null) {
      final names = note.outcome['contactName'].toString().split(' ');
      _firstNameController.text = names.isNotEmpty ? names[0] : '';
      _lastNameController.text = names.length > 1 ? names.sublist(1).join(' ') : '';
      _contactEmailController.text = note.outcome['contactEmail'] ?? '';
      _contactPhoneController.text = note.outcome['contactPhone'] ?? '';
    }
  }

  @override
  void dispose() {
    _companySearchController.dispose();
    _companyNameController.dispose();
    _websiteUrlController.dispose();
    _customerPhoneController.dispose();
    _customerEmailController.dispose();
    _abnController.dispose();
    _industryController.dispose();
    _salesRepController.dispose();
    _campaignController.dispose();
    _address1Controller.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _zipController.dispose();
    _countryController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _titleController.dispose();
    _contactEmailController.dispose();
    _contactPhoneController.dispose();
    _initialNotesController.dispose();
    super.dispose();
  }

  Future<void> _searchPlaces(String query) async {
    if (query.length < 3) {
      setState(() => _placePredictions = []);
      return;
    }

    setState(() => _isSearching = true);
    try {
      final predictions = await _placesService.searchPlaces(query);
      setState(() => _placePredictions = predictions);
    } catch (e) {
      debugPrint('Error searching places: $e');
    } finally {
      setState(() => _isSearching = false);
    }
  }

  Future<void> _selectPlace(Map<String, dynamic> prediction) async {
    final placeId = prediction['place_id'];
    setState(() {
      _isSearching = true;
      _placePredictions = [];
      _companySearchController.text = prediction['description'];
    });

    try {
      final details = await _placesService.getPlaceDetails(placeId);
      
      _companyNameController.text = details?['name'] ?? '';
      _websiteUrlController.text = details?['website'] ?? '';
      _customerPhoneController.text = details?['formatted_phone_number'] ?? '';
      
      final addr = details?['address_components'] as List? ?? [];
      String streetNumber = '';
      String route = '';
      
      for (var component in addr) {
        final types = component['types'] as List;
        if (types.contains('street_number')) streetNumber = component['long_name'];
        if (types.contains('route')) route = component['long_name'];
        if (types.contains('locality')) _cityController.text = component['long_name'];
        if (types.contains('administrative_area_level_1')) _stateController.text = component['short_name'];
        if (types.contains('postal_code')) _zipController.text = component['long_name'];
        if (types.contains('country')) _countryController.text = component['long_name'];
      }
      
      _streetController.text = '$streetNumber $route'.trim();
      
      // Auto-fill contact info with business name as Last Name if empty
      if (_lastNameController.text.isEmpty) {
        _lastNameController.text = details?['name'] ?? '';
      }
      
      // AI check for duplicates
      _checkDuplicate(_companyNameController.text);
      
    } catch (e) {
      debugPrint('Error getting place details: $e');
    } finally {
      setState(() => _isSearching = false);
    }
  }

  Future<void> _checkDuplicate(String name) async {
    final firestoreService = Provider.of<FirestoreService>(context, listen: false);
    final duplicateId = await firestoreService.checkForDuplicateLead(
      companyName: name,
      websiteUrl: _websiteUrlController.text.trim(),
      email: _customerEmailController.text.trim(),
    );
    if (duplicateId != null) {
      setState(() => _duplicateLeadId = duplicateId);
      _showDuplicateDialog();
    }
  }

  void _showDuplicateDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Duplicate Found'),
        content: const Text('This business appears to already exist in your system. You can view the existing lead or link this visit to it.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          if (widget.fromVisitNoteId != null)
            ElevatedButton(
              onPressed: _linkToDuplicate,
              child: const Text('Link Visit to this Lead'),
            ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/lead-detail', arguments: _duplicateLeadId);
            },
            child: const Text('View Existing Lead'),
          ),
        ],
      ),
    );
  }

  Future<void> _linkToDuplicate() async {
    if (_duplicateLeadId == null || widget.fromVisitNoteId == null) return;
    
    final firestoreService = Provider.of<FirestoreService>(context, listen: false);
    await firestoreService.updateVisitNote(widget.fromVisitNoteId!, {
      'status': 'Converted',
      'leadId': _duplicateLeadId,
    });
    
    if (mounted) {
      Navigator.pop(context); // Close dialog
      Navigator.pop(context); // Go back
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Visit note linked successfully.')),
      );
    }
  }

  Future<void> _runAiProspecting() async {
    if (_websiteUrlController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a website URL first.')),
      );
      return;
    }

    setState(() => _isAiProspecting = true);
    try {
      final result = await _aiService.prospectWebsite(_websiteUrlController.text);
      if (result != null && result['contacts'] != null && (result['contacts'] as List).isNotEmpty) {
        final contact = (result['contacts'] as List).first;
        final names = contact['name'].toString().split(' ');
        setState(() {
          _firstNameController.text = names.isNotEmpty ? names[0] : '';
          _lastNameController.text = names.length > 1 ? names.sublist(1).join(' ') : '';
          _titleController.text = contact['title'] ?? 'Primary Contact';
          _contactEmailController.text = contact['email'] ?? '';
          _contactPhoneController.text = contact['phone'] ?? '';
        });
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI successfully retrieved contact info.')),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI could not find specific contacts on this website.')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('AI Prospecting failed: $e')),
      );
    } finally {
      setState(() => _isAiProspecting = false);
    }
  }

  Future<void> _toggleListening() async {
    if (_isListening) {
      _speechService.stopListening();
      setState(() => _isListening = false);
    } else {
      final available = await _speechService.initialize();
      if (available) {
        setState(() => _isListening = true);
        _speechService.startListening((text) {
          setState(() {
            _initialNotesController.text = '${_initialNotesController.text} $text'.trim();
          });
        });
      }
    }
  }

  bool _isValidEmail(String email) {
    if (email.isEmpty) return true;
    final cleanEmail = email.toLowerCase().trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(cleanEmail)) return false;
    
    final parts = cleanEmail.split('@');
    final forbidden = ['n/a', 'na', 'none', 'nil', 'null', 'test', 'noemail', 'no-email', 'abc', '123', 'xyz', 'garbage'];
    if (forbidden.contains(parts[0]) || forbidden.contains(parts[1].split('.')[0])) return false;
    
    return true;
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    
    final firestoreService = Provider.of<FirestoreService>(context, listen: false);
    final netSuiteService = NetSuiteService();
    
    try {
      final discoveryString = firestoreService.formatDiscoveryData(_sourceVisitNote?.discoveryData);
      
      final result = await netSuiteService.sendNewLead(
        companyName: _companyNameController.text.trim(),
        websiteUrl: _websiteUrlController.text.trim(),
        customerPhone: _customerPhoneController.text.trim(),
        customerServiceEmail: _customerEmailController.text.trim(),
        abn: _abnController.text.trim(),
        industryCategory: _industryController.text,
        campaign: _campaignController.text.isNotEmpty ? _campaignController.text : (_currentUser?.role == 'Field Sales' ? 'Door-to-Door' : 'Outbound'),
        address: {
          'address1': _address1Controller.text.trim(),
          'street': _streetController.text.trim(),
          'city': _cityController.text.trim(),
          'state': _stateController.text.trim(),
          'zip': _zipController.text.trim(),
          'country': _countryController.text.trim(),
          'lat': _sourceVisitNote?.address?.lat,
          'lng': _sourceVisitNote?.address?.lng,
        },
        contact: {
          'firstName': _firstNameController.text.trim(),
          'lastName': _lastNameController.text.trim(),
          'title': _titleController.text.trim(),
          'email': _contactEmailController.text.trim(),
          'phone': _contactPhoneController.text.trim(),
        },
        initialNotes: _initialNotesController.text.trim(),
        dialerAssigned: _sourceVisitNote?.capturedBy ?? _currentUser?.displayName,
        salesRepAssigned: _salesRepController.text,
        discoveryString: discoveryString,
        visitNoteID: widget.fromVisitNoteId,
      );

      if (result['success'] == true) {
        final leadId = result['leadId'];
        
        // Link visit note if applicable
        if (widget.fromVisitNoteId != null) {
          await firestoreService.updateVisitNote(widget.fromVisitNoteId!, {
            'status': 'Converted',
            'leadId': leadId,
          });
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Lead created successfully.')),
          );
          Navigator.pop(context);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'] ?? 'Failed to create lead.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      title: 'Create New Lead',
      currentRoute: '/leads/new',
      floatingActionButton: _isSubmitting ? null : FloatingActionButton(
        onPressed: _submitForm,
        backgroundColor: AppTheme.primary,
        child: const Icon(Icons.check, color: Colors.white),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isSubmitting)
                  const LinearProgressIndicator(),
                const SizedBox(height: 16),
                _buildSectionHeader(Icons.search, 'Find a Business'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _companySearchController,
                  decoration: InputDecoration(
                    labelText: 'Search by Company Name or Address',
                    hintText: 'Start typing to search Google Maps...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _isSearching ? const SizedBox(width: 20, height: 20, child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2))) : null,
                  ),
                  onChanged: _searchPlaces,
                ),
                if (_placePredictions.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, 2))],
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _placePredictions.length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final p = _placePredictions[index];
                        return ListTile(
                          title: Text(p['description']),
                          onTap: () => _selectPlace(p),
                        );
                      },
                    ),
                  ),
                
                const Divider(height: 48),
                
                if (_sourceVisitNote?.imageUrls.isNotEmpty ?? false) ...[
                  _buildSectionHeader(Icons.camera_alt, 'Captured Images from Visit'),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 120,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _sourceVisitNote!.imageUrls.length,
                      separatorBuilder: (context, index) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        return Container(
                          width: 200,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            image: DecorationImage(
                              image: NetworkImage(_sourceVisitNote!.imageUrls[index]),
                              fit: BoxFit.cover,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const Divider(height: 48),
                ],

                _buildSectionHeader(Icons.business, 'Company Details'),
                const SizedBox(height: 16),
                _buildTextField(_companyNameController, 'Company Name*', validator: (v) => v!.isEmpty ? 'Required' : null),
                const SizedBox(height: 16),
                _buildTextField(_websiteUrlController, 'Website', hint: 'https://example.com'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(_customerPhoneController, 'Company Phone*', type: TextInputType.phone, validator: (v) => v!.isEmpty ? 'Required' : null)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildTextField(_customerEmailController, 'Company Email*', type: TextInputType.emailAddress, validator: (v) => !_isValidEmail(v!) ? 'Invalid email' : (v.isEmpty ? 'Required' : null))),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(_abnController, 'ABN', hint: '11 digits', validator: (v) => (v!.isNotEmpty && v.length != 11) ? 'Must be 11 digits' : null)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _industryController.text.isEmpty ? null : _industryController.text,
                        decoration: const InputDecoration(labelText: 'Industry'),
                        items: _industryCategories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                        onChanged: (v) => setState(() => _industryController.text = v!),
                      ),
                    ),
                  ],
                ),
                if (_currentUser?.role != 'Field Sales') ...[
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _campaignController.text.isEmpty ? null : _campaignController.text,
                    decoration: const InputDecoration(labelText: 'Campaign'),
                    items: _campaigns.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (v) => setState(() => _campaignController.text = v!),
                  ),
                ],
                
                const Divider(height: 48),
                
                _buildSectionHeader(Icons.map, 'Address'),
                const SizedBox(height: 16),
                _buildTextField(_address1Controller, 'Address Line 1 (Optional)', hint: 'Unit, Suite, etc.'),
                const SizedBox(height: 16),
                _buildTextField(_streetController, 'Street Address*', validator: (v) => v!.isEmpty ? 'Required' : null),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(_cityController, 'Suburb*', validator: (v) => v!.isEmpty ? 'Required' : null)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildTextField(_stateController, 'State*', validator: (v) => v!.isEmpty ? 'Required' : null)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(_zipController, 'Postcode*', validator: (v) => v!.isEmpty ? 'Required' : null)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildTextField(_countryController, 'Country*', validator: (v) => v!.isEmpty ? 'Required' : null)),
                  ],
                ),
                
                const Divider(height: 48),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionHeader(Icons.person, 'Primary Contact'),
                    TextButton.icon(
                      onPressed: _isAiProspecting ? null : _runAiProspecting,
                      icon: _isAiProspecting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
                      label: const Text('AI Prospect Website'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(_firstNameController, 'First Name')),
                    const SizedBox(width: 16),
                    Expanded(child: _buildTextField(_lastNameController, 'Last Name')),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField(_titleController, 'Title'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(_contactEmailController, 'Email', type: TextInputType.emailAddress, validator: (v) => !_isValidEmail(v!) ? 'Invalid email' : null)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildTextField(_contactPhoneController, 'Phone', type: TextInputType.phone)),
                  ],
                ),
                
                if (_sourceVisitNote?.discoveryData.isNotEmpty ?? false) ...[
                  const Divider(height: 48),
                  _buildSectionHeader(Icons.info_outline, 'Field Discovery Answers'),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: _sourceVisitNote!.discoveryData.entries.map((e) {
                        final key = e.key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}').replaceFirstMapped(RegExp(r'^.'), (m) => m.group(0)!.toUpperCase());
                        final value = e.value is List ? (e.value as List).join(', ') : e.value.toString();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: RichText(
                            text: TextSpan(
                              style: Theme.of(context).textTheme.bodyMedium,
                              children: [
                                TextSpan(text: '$key: ', style: const TextStyle(fontWeight: FontWeight.bold)),
                                TextSpan(text: value),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],

                const Divider(height: 48),
                
                _buildSectionHeader(Icons.notes, 'Initial Notes'),
                const SizedBox(height: 16),
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    TextFormField(
                      controller: _initialNotesController,
                      maxLines: 5,
                      decoration: const InputDecoration(
                        hintText: 'Add any initial notes or comments about this lead...',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: FloatingActionButton.small(
                        onPressed: _toggleListening,
                        backgroundColor: _isListening ? Colors.red : null,
                        child: Icon(_isListening ? Icons.mic_off : Icons.mic),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submitForm,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                    ),
                    child: _isSubmitting 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Create Lead', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.primary),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {String? hint, TextInputType type = TextInputType.text, String? Function(String?)? validator}) {
    return TextFormField(
      controller: controller,
      keyboardType: type,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
      ),
      validator: validator,
    );
  }
}
