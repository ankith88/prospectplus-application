import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_auth/firebase_auth.dart' as auth;
import 'package:fl_chart/fl_chart.dart';
import '../../models/user_profile.dart';
import '../../services/discovery_scoring_service.dart';
import '../../services/google_places_service.dart';
import '../../services/image_service.dart';
import '../../services/speech_service.dart';
import '../../services/auth_service.dart';
import '../../services/visit_service.dart';
import '../../services/netsuite_service.dart';
import '../../models/visit_note.dart';

class CaptureVisitScreen extends StatefulWidget {
  final VisitNote? note;
  const CaptureVisitScreen({super.key, this.note});

  @override
  State<CaptureVisitScreen> createState() => _CaptureVisitScreenState();
}

class _CaptureVisitScreenState extends State<CaptureVisitScreen> {
  int _currentStep = 0;
  final PageController _pageController = PageController();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();

  final GooglePlacesService _placesService = GooglePlacesService(dotenv.get('GOOGLE_MAPS_API_KEY'));
  final ImageService _imageService = ImageService();
  final SpeechService _speechService = SpeechService();
  final AuthService _authService = AuthService();
  final NetSuiteService _netSuiteService = NetSuiteService();
  final VisitService _visitService = VisitService();

  List<Map<String, dynamic>> _placePredictions = [];
  Map<String, dynamic>? _selectedPlace;
  bool _isSpeechInitialized = false;
  UserProfile? _currentUserProfile;
  bool _isSubmitting = false;

  final TextEditingController _contactNameController = TextEditingController();
  final TextEditingController _contactEmailController = TextEditingController();
  final TextEditingController _contactPhoneController = TextEditingController();

  @override
  void dispose() {
    _contactNameController.dispose();
    _contactEmailController.dispose();
    _contactPhoneController.dispose();
    super.dispose();
  }

  final Map<String, dynamic> _formData = {
    'companyName': '',
    'address': '',
    'businessType': 'Retail',
    'discoverySignals': <String>[],
    'inconvenience': null,
    'occurrence': null,
    'taskOwner': null,
    'personSpokenWithName': '',
    'personSpokenWithTitle': '',
    'personSpokenWithEmail': '',
    'personSpokenWithPhone': '',
    'personSpokenWithTags': <String>[],
    'decisionMakerName': '',
    'decisionMakerTitle': '',
    'decisionMakerEmail': '',
    'decisionMakerPhone': '',
    'lostPropertyProcess': null,
    'content': '',
    'imageUrls': <String>[],
    'images': <XFile>[],
    'outcomeType': null,
    'scheduledDate': null,
    'scheduledTime': null,
  };

  final List<String> _steps = [
    'Find Business',
    'Discovery',
    'Capture Note',
    'Select Outcome',
    'Photos',
    'Summary',
  ];

  @override
  void initState() {
    super.initState();
    _initSpeech();
    _loadUserProfile();
    if (widget.note != null) {
      _initializeFromNote(widget.note!);
    }
  }

  void _initializeFromNote(VisitNote note) {
    _formData['id'] = note.id;
    _formData['companyName'] = note.companyName ?? '';
    _formData['address'] = note.address?.fullAddress ?? '';
    _formData['businessType'] = note.outcome['businessType'] ?? 'Retail';
    _formData['discoverySignals'] = List<String>.from(note.discoveryData['signals'] ?? []);
    _formData['inconvenience'] = note.discoveryData['inconvenience'];
    _formData['occurrence'] = note.discoveryData['occurrence'];
    _formData['taskOwner'] = note.discoveryData['taskOwner'];
    
    // Map contact details
    _formData['personSpokenWithName'] = note.outcome['contactName'] ?? '';
    _formData['personSpokenWithPhone'] = note.outcome['contactPhone'] ?? '';
    _formData['personSpokenWithEmail'] = note.outcome['contactEmail'] ?? '';
    
    _formData['content'] = note.content;
    _formData['imageUrls'] = List<String>.from(note.imageUrls);
    _formData['outcomeType'] = note.outcome['type'];
    _formData['scheduledDate'] = note.scheduledDate;
    _formData['scheduledTime'] = note.scheduledTime;
    
    _searchController.text = note.companyName ?? '';
    _noteController.text = note.content;
  }

  Future<void> _loadUserProfile() async {
    final user = auth.FirebaseAuth.instance.currentUser;
    if (user != null) {
      final profile = await _authService.getUserProfile(user.uid);
      setState(() {
        _currentUserProfile = profile;
      });
    }
  }

  Future<void> _initSpeech() async {
    _isSpeechInitialized = await _speechService.initialize();
  }

  bool _isValidRealEmail(String? email) {
    if (email == null || email.isEmpty) return true;
    final cleanEmail = email.toLowerCase().trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(cleanEmail)) return false;
    
    final parts = cleanEmail.split('@');
    final forbidden = ['n/a', 'na', 'none', 'nil', 'null', 'test', 'noemail', 'no-email', 'abc', '123', 'xyz', 'garbage'];
    
    final userPart = parts[0];
    if (forbidden.contains(userPart)) return false;
    
    final domainParts = parts[1].split('.');
    if (forbidden.contains(domainParts[0])) return false;
    
    return true;
  }

  bool _validateStep(int step) {
    switch (step) {
      case 0: // Find Business
        if (_selectedPlace == null && (_formData['images'] as List<XFile>).isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please select a business or take a photo.')),
          );
          return false;
        }
        return true;
      case 2: // Capture Note
        if (_formData['content'] == null || _formData['content'].toString().trim().isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please provide more detail in your note.')),
          );
          return false;
        }
        return true;
      case 3: // Select Outcome
        final outcome = _formData['outcomeType'];
        if (outcome == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please select an outcome.')),
          );
          return false;
        }
        
        if (outcome == 'Qualified - Set Appointment') {
          final name = _formData['personSpokenWithName']?.toString().trim() ?? '';
          final email = _formData['personSpokenWithEmail']?.toString().trim() ?? '';
          final phone = _formData['personSpokenWithPhone']?.toString().trim() ?? '';
          final date = _formData['scheduledDate'];
          final time = _formData['scheduledTime'];
          
          if (name.isEmpty || email.isEmpty || phone.isEmpty || date == null || time == null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('All appointment details (Name, Email, Phone, Date, Time) are mandatory.')),
            );
            return false;
          }
          
          if (!_isValidRealEmail(email)) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please enter a valid email address.')),
            );
            return false;
          }
        } else if (outcome == 'Qualified - Call Back/Send Info' || outcome == 'Upsell') {
          final List<String> signals = List<String>.from(_formData['discoverySignals'] ?? []);
          if (signals.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please go back and select discovery tags for a qualified lead.')),
            );
            return false;
          }
          
          final name = _formData['personSpokenWithName']?.toString().trim() ?? '';
          final email = _formData['personSpokenWithEmail']?.toString().trim() ?? '';
          if (name.isEmpty || email.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Contact Name and Email are mandatory for qualified leads.')),
            );
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  }

  void _nextStep() {
    if (!_validateStep(_currentStep)) return;
    
    if (_currentStep < _steps.length - 1) {
      setState(() {
        _currentStep++;
      });
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _submitForm();
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_steps[_currentStep]),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildProgressBar(),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildSearchStep(),
                _buildDiscoveryStep(),
                _buildNoteStep(),
                _buildOutcomeStep(),
                _buildPhotoStep(),
                _buildSummaryStep(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildProgressBar() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      color: Colors.white,
      child: Row(
        children: List.generate(_steps.length * 2 - 1, (index) {
          if (index.isEven) {
            final stepIndex = index ~/ 2;
            final isCompleted = stepIndex < _currentStep;
            final isCurrent = stepIndex == _currentStep;
            
            return Expanded(
              child: Column(
                children: [
                   Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isCompleted 
                        ? const Color(0xFF095c7b) 
                        : isCurrent 
                          ? const Color(0xFF095c7b).withOpacity(0.1) 
                          : Colors.grey[200],
                      border: isCurrent 
                        ? Border.all(color: const Color(0xFF095c7b), width: 2) 
                        : null,
                    ),
                    child: Center(
                      child: isCompleted
                        ? const Icon(Icons.check, size: 18, color: Colors.white)
                        : Text(
                            '${stepIndex + 1}',
                            style: TextStyle(
                              color: isCurrent ? const Color(0xFF095c7b) : Colors.grey[600],
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                          ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _steps[stepIndex].split(' ').first,
                    style: TextStyle(
                      fontSize: 10,
                      color: isCurrent ? const Color(0xFF095c7b) : Colors.grey[600],
                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            );
          } else {
            final stepIndex = index ~/ 2;
            return Container(
              width: 20,
              height: 2,
              margin: const EdgeInsets.only(bottom: 20),
              color: stepIndex < _currentStep ? const Color(0xFF095c7b) : Colors.grey[200],
            );
          }
        }),
      ),
    );
  }

  Widget _buildSearchStep() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              labelText: 'Search Business Name',
              hintText: 'e.g. Starbucks',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() {
                          _searchController.clear();
                          _placePredictions = [];
                          _selectedPlace = null;
                        });
                      },
                    )
                  : null,
              border: const OutlineInputBorder(),
            ),
            onChanged: (value) async {
              if (value.length > 2) {
                final predictions = await _placesService.searchPlaces(value);
                setState(() {
                  _placePredictions = predictions;
                });
              } else {
                setState(() {
                  _placePredictions = [];
                });
              }
            },
          ),
          const SizedBox(height: 24),
          _buildPhotoUploadButtons(),
          const SizedBox(height: 24),
          if (_selectedPlace != null || (_formData['images'] as List<XFile>).isNotEmpty)
            Expanded(
              child: ListView(
                children: [
                   _buildStep1Fields(),
                ],
              ),
            )
          else
            Expanded(
              child: _buildPlacePredictionsList(),
            ),
        ],
      ),
    );
  }

  Widget _buildPhotoUploadButtons() {
    final images = _formData['images'] as List<XFile>;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Quick Capture: Take a Photo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => _pickImage(ImageSource.camera),
                icon: const Icon(Icons.camera_alt),
                label: const Text('Camera'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF095c7b),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _pickImage(ImageSource.gallery),
                icon: const Icon(Icons.photo_library),
                label: const Text('Gallery'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        ),
        if (images.isNotEmpty)
          Container(
            height: 100,
            margin: const EdgeInsets.only(top: 16),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: images.length,
              itemBuilder: (context, index) {
                final image = images[index];
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: kIsWeb 
                          ? Image.network(image.path, width: 100, height: 100, fit: BoxFit.cover)
                          : Image.file(File(image.path), width: 100, height: 100, fit: BoxFit.cover),
                      ),
                      Positioned(
                        right: 4,
                        top: 4,
                        child: GestureDetector(
                          onTap: () => setState(() => images.removeAt(index)),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            child: const Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildPlacePredictionsList() {
    if (_placePredictions.isEmpty && _searchController.text.length > 2) {
       return const Center(child: Text('No businesses found. Try a different search or take a photo of the business card.'));
    }
    return ListView.builder(
      itemCount: _placePredictions.length,
      itemBuilder: (context, index) {
        final prediction = _placePredictions[index];
        return ListTile(
          leading: const Icon(Icons.location_on),
          title: Text(prediction['description']),
          onTap: () async {
            final details = await _placesService.getPlaceDetails(prediction['place_id']);
            if (details != null) {
              setState(() {
                _selectedPlace = details;
                _formData['companyName'] = details['name'];
                _formData['address'] = details['formatted_address'];
                _searchController.text = details['name'];
                _placePredictions = [];
              });
            }
          },
        );
      },
    );
  }

  Widget _buildStep1Fields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_selectedPlace != null)
          Card(
            color: const Color(0xFF095c7b).withOpacity(0.05),
            margin: const EdgeInsets.only(bottom: 24),
            child: ListTile(
              leading: const Icon(Icons.business, color: Color(0xFF095c7b)),
              title: Text(_selectedPlace!['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(_selectedPlace!['formatted_address'] ?? ''),
              trailing: IconButton(
                icon: const Icon(Icons.edit, size: 20),
                onPressed: () => setState(() {
                  _selectedPlace = null;
                  _formData['companyName'] = '';
                }),
              ),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 24),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Company Name (Manual Entry)',
                hintText: 'Enter business name if not found in search',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.business),
              ),
              onChanged: (v) => _formData['companyName'] = v,
            ),
          ),

        const Text('Business Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 8),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'Retail', label: Text('Retail'), icon: Icon(Icons.store)),
            ButtonSegment(value: 'B2B', label: Text('B2B/Office'), icon: Icon(Icons.business_center)),
          ],
          selected: {_formData['businessType']},
          onSelectionChanged: (Set<String> newSelection) {
            setState(() {
              _formData['businessType'] = newSelection.first;
            });
          },
        ),
        const SizedBox(height: 24),

        _buildContactCard('Person Spoken With', 'personSpokenWith'),
        const SizedBox(height: 16),
        _buildContactCard('Decision Maker Details (Optional)', 'decisionMaker'),
        const SizedBox(height: 24),
      ],
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    if (source == ImageSource.camera) {
      final XFile? image = await _imageService.pickImageFromCamera();
      if (image != null) {
        setState(() {
          (_formData['images'] as List<XFile>).add(image);
        });
      }
    } else {
      final List<XFile>? images = await _imageService.pickMultiImages();
      if (images != null) {
        setState(() {
          (_formData['images'] as List<XFile>).addAll(images);
        });
      }
    }
  }

  Widget _buildContactCard(String title, String prefix) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
              onChanged: (v) => _formData['${prefix}Name'] = v,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Title/Role', border: OutlineInputBorder()),
              onChanged: (v) => _formData['${prefix}Title'] = v,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                    onChanged: (v) => _formData['${prefix}Email'] = v,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(labelText: 'Phone', border: OutlineInputBorder()),
                    onChanged: (v) => _formData['${prefix}Phone'] = v,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiscoveryStep() {
    final isFieldSales = _currentUserProfile?.role == 'Field Sales';
    
    final discoverySignalGroups = [
      {
        'question': 'Who currently runs items back & forth to the Post Office?',
        'signals': [
          {'label': 'Pays for Australia Post', 'desc': 'They currently pay for Australia Post services.'},
          {'label': 'Staff Handle Post', 'desc': 'Staff leave the office to lodge mail/parcels.'},
        ],
        'conditional': {
          'label': 'Drop-off is a hassle', 
          'desc': 'They find dropping off items inconvenient.',
          'dependsOn': ['Pays for Australia Post', 'Staff Handle Post']
        }
      },
      {
        'question': 'Who are you Shipping with?',
        'signals': [
          {'label': 'Uses Australia Post', 'desc': 'They use AP products like MyPost Business.'},
          {'label': 'Uses other couriers (<5kg)', 'desc': 'They use other couriers for small parcels.'},
          {'label': 'Uses other couriers (100+ per week)', 'desc': 'They are a high-volume shipper with other couriers.'},
        ]
      },
      {
        'question': 'What is your website built on?',
        'signals': [
          {'label': 'Shopify / WooCommerce', 'desc': 'They use Shopify or WooCommerce for e-commerce.'},
          {'label': 'Other label platforms', 'desc': 'They use other platforms like Starshipit.'},
        ]
      },
      {
        'question': 'Is there anything else you leave the office for?',
        'signals': [
          {'label': 'Banking Runs', 'desc': 'Staff leave office for banking errands.'},
          {'label': 'Needs same-day Delivery', 'desc': 'They have a need for same-day delivery services.'},
          {'label': 'Inter-office Deliveries', 'desc': 'They move items between their own offices.'},
        ]
      },
      {
        'question': 'Where are decisions made?',
        'signals': [
          {'label': 'Decisions made at Head Office', 'desc': 'Financial or shipping decisions are not made at this location.'},
        ]
      }
    ];

    final lostPropertyOptions = [
      {'label': 'Staff organise returns manually', 'desc': 'Team packs items, arranges postage or courier'},
      {'label': 'Guests contact us to arrange shipping', 'desc': 'Staff manage payments, labels or booking'},
      {'label': 'Rarely happens / informal process', 'desc': 'No standard system for returns'},
      {'label': 'Already use a return platform', 'desc': 'Lost property handled through a system'},
    ];

    final List<String> selectedSignals = List<String>.from(_formData['discoverySignals'] ?? []);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...discoverySignalGroups.map((group) {
          final signals = group['signals'] as List<Map<String, String>>;
          final conditional = group['conditional'] as Map<String, dynamic>?;
          final question = group['question'] as String;
          
          bool showConditional = false;
          if (conditional != null) {
            final dependsOn = conditional['dependsOn'] as List<String>;
            showConditional = selectedSignals.any((s) => dependsOn.contains(s));
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(question, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ...signals.map((s) => _buildSignalButton(s['label']!, s['desc']!, selectedSignals)),
                  if (showConditional)
                    _buildSignalButton(conditional!['label']!, conditional['desc']!, selectedSignals),
                ],
              ),
              const SizedBox(height: 24),
            ],
          );
        }),

        if (!isFieldSales) ...[
          const Divider(),
          const SizedBox(height: 16),
          const Text('How do you handle guest lost property returns?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.5,
            children: lostPropertyOptions.map((opt) {
              final isSelected = _formData['lostPropertyProcess'] == opt['label'];
              return _buildOptionButton(opt['label']!, opt['desc']!, isSelected, (val) {
                setState(() => _formData['lostPropertyProcess'] = val);
              });
            }).toList(),
          ),
          const SizedBox(height: 24),
        ],

        const Divider(),
        const SizedBox(height: 16),
        const Text('Qualification Context (Fast Picks)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 16),
        
        _buildDiscoveryRadioGroup('How inconvenient is this?', 'inconvenience', ['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']),
        _buildDiscoveryRadioGroup('How often does this occur?', 'occurrence', ['Daily', 'Weekly', 'Ad-hoc']),
        _buildDiscoveryRadioGroup('Who owns this task?', 'taskOwner', ['Shared admin responsibility', 'Dedicated staff role', 'Ad-hoc / whoever is free']),
        
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildSignalButton(String label, String desc, List<String> selected) {
    final isSelected = selected.contains(label);
    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            selected.remove(label);
          } else {
            selected.add(label);
          }
          _formData['discoverySignals'] = selected;
        });
      },
      child: Container(
        width: (MediaQuery.of(context).size.width - 40) / 2,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF095c7b) : Colors.white,
          border: Border.all(color: isSelected ? const Color(0xFF095c7b) : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black, fontSize: 13)),
            const SizedBox(height: 4),
            Text(desc, style: TextStyle(fontSize: 10, color: isSelected ? Colors.white.withOpacity(0.8) : Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Widget _buildOptionButton(String label, String desc, bool isSelected, Function(String) onTap) {
    return InkWell(
      onTap: () => onTap(label),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF095c7b) : Colors.white,
          border: Border.all(color: isSelected ? const Color(0xFF095c7b) : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: TextStyle(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black, fontSize: 12)),
            const SizedBox(height: 4),
            Text(desc, style: TextStyle(fontSize: 10, color: isSelected ? Colors.white.withOpacity(0.8) : Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Widget _buildDiscoveryRadioGroup(String title, String key, List<String> options) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        ...options.map((option) {
          return RadioListTile<String>(
            title: Text(option, style: const TextStyle(fontSize: 14)),
            value: option,
            groupValue: _formData[key],
            onChanged: (String? value) {
              setState(() {
                _formData[key] = value;
              });
            },
            activeColor: const Color(0xFF095c7b),
            contentPadding: EdgeInsets.zero,
            dense: true,
          );
        }).toList(),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildNoteStep() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: TextField(
              controller: _noteController,
              maxLines: null,
              expands: true,
              decoration: const InputDecoration(
                hintText: 'Type or use voice to capture notes...',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) => setState(() => _formData['content'] = value),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                onPressed: _isSpeechInitialized ? () {
                  if (_speechService.isListening) {
                    _speechService.stopListening();
                    setState(() {});
                  } else {
                    _speechService.startListening((text) {
                      setState(() {
                        _noteController.text = '${_noteController.text} $text'.trim();
                        _formData['content'] = _noteController.text;
                      });
                    });
                    setState(() {});
                  }
                } : null,
                icon: Icon(_speechService.isListening ? Icons.stop : Icons.mic),
                label: Text(_speechService.isListening ? 'Stop Listening' : 'Voice Input'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _speechService.isListening ? Colors.red : const Color(0xFF095c7b),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOutcomeStep() {
    final outcomes = [
      {'label': 'Qualified - Set Appointment', 'color': const Color(0xFF166534), 'bg': const Color(0xFFdcfce7)},
      {'label': 'Qualified - Call Back/Send Info', 'color': const Color(0xFF166534), 'bg': const Color(0xFFdcfce7)},
      {'label': 'Upsell', 'color': Colors.white, 'bg': Colors.indigo},
      {'label': 'Unqualified Opportunity', 'color': Colors.black, 'bg': Colors.amber},
      {'label': 'Prospect - No Access/No Contact', 'color': Colors.white, 'bg': Colors.grey[600]},
      {'label': 'Not Interested', 'color': Colors.white, 'bg': Colors.grey[600]},
      {'label': 'Empty / Closed', 'color': Colors.white, 'bg': Colors.blueGrey[600]},
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Choose the final outcome of your visit.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        ...outcomes.map((outcome) {
          final isSelected = _formData['outcomeType'] == outcome['label'];
          final isAppointment = outcome['label'] == 'Qualified - Set Appointment';

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _formData['outcomeType'] = outcome['label'];
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isSelected ? (outcome['bg'] as Color) : Colors.white,
                    foregroundColor: isSelected ? (outcome['color'] as Color) : Colors.black87,
                    elevation: isSelected ? 2 : 0,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(
                        color: isSelected ? (outcome['bg'] as Color) : Colors.grey[300]!,
                        width: 1,
                      ),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (isSelected) const Icon(Icons.check_circle, size: 18),
                      if (isSelected) const SizedBox(width: 8),
                      Text(
                        outcome['label'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
              if (isSelected && isAppointment) _buildAppointmentForm(),
              if (isSelected && outcome['label'] == 'Qualified - Call Back/Send Info')
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: Text('Discovery tags are required for this outcome.', style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold)),
                ),
            ],
          );
        }).toList(),
      ],
    );
  }

  Widget _buildAppointmentForm() {
    return Card(
      margin: const EdgeInsets.only(bottom: 24),
      color: Colors.green[50]?.withOpacity(0.5),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Appointment Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF166534))),
                if (_formData['decisionMakerName']?.toString().isNotEmpty ?? false)
                  TextButton.icon(
                    onPressed: _useDecisionMakerInfo,
                    icon: const Icon(Icons.copy, size: 14),
                    label: const Text('Use DM Info', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _buildMandatoryField('Name*', 'personSpokenWithName', Icons.person),
            const SizedBox(height: 12),
            _buildMandatoryField('Phone*', 'personSpokenWithPhone', Icons.phone),
            const SizedBox(height: 12),
            _buildMandatoryField('Email*', 'personSpokenWithEmail', Icons.email),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Date*', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      const SizedBox(height: 4),
                      OutlinedButton.icon(
                        onPressed: () => _selectDate(context),
                        icon: const Icon(Icons.calendar_today, size: 16),
                        label: Text(
                          _formData['scheduledDate'] != null 
                              ? (_formData['scheduledDate'] as DateTime).toLocal().toString().split(' ')[0]
                              : 'Pick Date',
                          style: const TextStyle(fontSize: 13),
                        ),
                        style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 45)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Time*', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      const SizedBox(height: 4),
                      OutlinedButton.icon(
                        onPressed: () => _selectTime(context),
                        icon: const Icon(Icons.access_time, size: 16),
                        label: Text(
                          _formData['scheduledTime'] != null 
                              ? (_formData['scheduledTime'] as TimeOfDay).format(context)
                              : 'Pick Time',
                          style: const TextStyle(fontSize: 13),
                        ),
                        style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 45)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMandatoryField(String label, String key, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        const SizedBox(height: 4),
        TextField(
          onChanged: (val) => setState(() => _formData[key] = val),
          controller: _getControllerForKey(key, _formData[key]),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 18),
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            isDense: true,
          ),
          style: const TextStyle(fontSize: 14),
        ),
      ],
    );
  }

  TextEditingController _getControllerForKey(String key, dynamic value) {
    if (key == 'personSpokenWithName') return _contactNameController..text = value ?? '';
    if (key == 'personSpokenWithEmail') return _contactEmailController..text = value ?? '';
    if (key == 'personSpokenWithPhone') return _contactPhoneController..text = value ?? '';
    return TextEditingController(text: value ?? '');
  }

  void _useDecisionMakerInfo() {
    setState(() {
      _formData['personSpokenWithName'] = _formData['decisionMakerName'];
      _formData['personSpokenWithEmail'] = _formData['decisionMakerEmail'];
      _formData['personSpokenWithPhone'] = _formData['decisionMakerPhone'];
      _formData['personSpokenWithTitle'] = _formData['decisionMakerTitle'];
      _contactNameController.text = _formData['personSpokenWithName'] ?? '';
      _contactEmailController.text = _formData['personSpokenWithEmail'] ?? '';
      _contactPhoneController.text = _formData['personSpokenWithPhone'] ?? '';
    });
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _formData['scheduledDate'] = picked;
      });
    }
  }

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() {
        _formData['scheduledTime'] = picked;
      });
    }
  }

  Widget _buildPhotoStep() {
    final List<XFile> images = _formData['images'] as List<XFile>;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Upload or capture evidence photos.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Take Photo'),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF095c7b), foregroundColor: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Upload'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Capture business cards, shipping labels, or store fronts.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        if (images.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: images.length,
            itemBuilder: (context, index) {
              return Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: kIsWeb
                        ? Image.network(images[index].path, fit: BoxFit.cover, width: double.infinity, height: double.infinity)
                        : Image.file(File(images[index].path), fit: BoxFit.cover, width: double.infinity, height: double.infinity),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => setState(() => images.removeAt(index)),
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
      ],
    );
  }

  Widget _buildSummaryStep() {
    final analysis = DiscoveryScoringService.calculateScoreAndRouting(_formData);
    final score = analysis['score'] as int? ?? 0;
    final routingTag = analysis['routingTag'] as String? ?? 'Service';
    final dashback = analysis['dashbackOpportunity'] as String? ?? '';
    final reason = analysis['scoringReason'] as String? ?? '';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Based on the answers provided, here is the lead analysis:',
          style: TextStyle(fontSize: 14, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        Card(
          elevation: 0,
          color: Colors.grey[50],
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey[200]!)),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('Score', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text('$score%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 32)),
                  ],
                ),
                Column(
                  children: [
                    const Text('Routing', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.route, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(routingTag, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                    ),
                  ],
                ),
                if (dashback.isNotEmpty)
                  Column(
                    children: [
                      const Text('Dashback', style: TextStyle(color: Colors.grey, fontSize: 12)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(dashback, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.blue[800])),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 250,
          child: RadarChart(
            RadarChartData(
              dataSets: [
                RadarDataSet(
                  fillColor: const Color(0xFF095c7b).withOpacity(0.4),
                  borderColor: const Color(0xFF095c7b),
                  entryRadius: 3,
                  dataEntries: _getRadarData(),
                ),
              ],
              radarShape: RadarShape.circle,
              radarBorderData: const BorderSide(color: Colors.transparent),
              tickBorderData: const BorderSide(color: Colors.transparent),
              gridBorderData: BorderSide(color: Colors.grey[300]!, width: 1),
              tickCount: 1,
              getTitle: (index, angle) {
                final titles = ['Service Fit', 'Product Fit', 'Inconvenience', 'Occurrence', 'Task Ownership'];
                return RadarChartTitle(text: titles[index], angle: angle);
              },
              titlePositionPercentageOffset: 0.2,
              titleTextStyle: const TextStyle(fontSize: 10, color: Colors.black),
            ),
          ),
        ),
        if (reason.isNotEmpty) ...[
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          const Text('Scoring Rationale:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          Text(reason, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
        const SizedBox(height: 40),
      ],
    );
  }

  List<RadarEntry> _getRadarData() {
    final List<double> scores = [0, 0, 0, 0, 0];
    final List<String> signals = List<String>.from(_formData['discoverySignals'] ?? []);

    if (signals.contains('Pays for Australia Post')) scores[0] += 40;
    if (signals.contains('Staff Handle Post')) scores[0] += 30;
    if (signals.contains('Drop-off is a hassle')) scores[0] += 30;
    if (signals.contains('Banking Runs')) scores[0] += 20;
    if (signals.contains('Inter-office Deliveries')) scores[0] += 20;

    if (signals.contains('Uses other couriers (<5kg)')) scores[1] += 40;
    if (signals.contains('Uses other couriers (100+ per week)')) scores[1] += 40;
    if (signals.contains('Uses Australia Post')) scores[1] += 30;
    if (signals.contains('Shopify / WooCommerce')) scores[1] += 20;

    if (_formData['inconvenience'] == 'Very inconvenient') {
      scores[2] = 100;
    } else if (_formData['inconvenience'] == 'Somewhat inconvenient') {
      scores[2] = 60;
    } else if (_formData['inconvenience'] == 'Not a big issue') {
      scores[2] = 20;
    }

    if (_formData['occurrence'] == 'Daily') {
      scores[3] = 100;
    } else if (_formData['occurrence'] == 'Weekly') {
      scores[3] = 60;
    } else if (_formData['occurrence'] == 'Ad-hoc') {
      scores[3] = 30;
    }

    if (_formData['taskOwner'] == 'Dedicated staff role') {
      scores[4] = 100;
    } else if (_formData['taskOwner'] == 'Shared admin responsibility') {
      scores[4] = 60;
    } else if (_formData['taskOwner'] == 'Ad-hoc / whoever is free') {
      scores[4] = 30;
    }

    return scores.map((s) => RadarEntry(value: s.clamp(0, 100).toDouble())).toList();
  }

  Widget _buildBottomBar() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (_currentStep > 0)
            TextButton(
              onPressed: _prevStep,
              child: const Text('BACK'),
            )
          else
            const SizedBox.shrink(),
          ElevatedButton(
            onPressed: _isSubmitting ? null : _nextStep,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF095c7b),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            ),
            child: _isSubmitting 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_currentStep < _steps.length - 1 ? 'NEXT' : 'SUBMIT', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _submitForm() async {
    if (_isSubmitting) return;
    if (_currentUserProfile == null) return;

    setState(() => _isSubmitting = true);

    try {
      final visitId = await _visitService.saveVisit({
        'companyName': _formData['companyName'],
        'address': _formData['address'],
        'businessType': _formData['businessType'],
        'capturedBy': _currentUserProfile!.displayName,
        'capturedByUid': _currentUserProfile!.id,
        'franchisee': _currentUserProfile!.franchisee,
        'discoveryData': DiscoveryScoringService.calculateScoreAndRouting(_formData),
        'note': _formData['content'],
        'outcome': {'type': _formData['outcomeType']},
        'contactPerson': {
          'name': _formData['personSpokenWithName'],
          'email': _formData['personSpokenWithEmail'],
          'phone': _formData['personSpokenWithPhone'],
        },
        'decisionMaker': {
          'name': _formData['decisionMakerName'],
          'title': _formData['decisionMakerTitle'],
          'email': _formData['decisionMakerEmail'],
          'phone': _formData['decisionMakerPhone'],
        },
        'scheduledDate': _formData['scheduledDate']?.toString(),
        'scheduledTime': _formData['scheduledTime']?.toString(),
      });

      final images = _formData['images'] as List<XFile>;
      if (images.isNotEmpty) {
        final imageUrls = await _visitService.uploadVisitImages(visitId, images);
        await _visitService.updateVisitImageUrls(visitId, imageUrls);
      }

      final discoveryAnswers = DiscoveryScoringService.calculateScoreAndRouting(_formData).entries.map((e) => '${e.key}: ${e.value}').join('\n');
      await _netSuiteService.sendVisitNote(
        capturedBy: _currentUserProfile?.displayName ?? 'Unknown',
        outcome: _formData['outcomeType'] ?? 'Unknown',
        companyName: _formData['companyName'] ?? 'Unknown',
        discoveryAnswers: discoveryAnswers,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Visit successfully captured!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
