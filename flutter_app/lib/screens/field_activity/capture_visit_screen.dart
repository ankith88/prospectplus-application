import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_auth/firebase_auth.dart' as auth;
import '../../models/user_profile.dart';
import '../../services/discovery_scoring_service.dart';
import '../../services/google_places_service.dart';
import '../../services/image_service.dart';
import '../../services/speech_service.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../services/netsuite_service.dart';

class CaptureVisitScreen extends StatefulWidget {
  const CaptureVisitScreen({super.key});

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
  final FirestoreService _firestoreService = FirestoreService();
  final NetSuiteService _netSuiteService = NetSuiteService();

  List<Map<String, dynamic>> _placePredictions = [];
  Map<String, dynamic>? _selectedPlace;
  bool _isSpeechInitialized = false;
  UserProfile? _currentUserProfile;
  bool _isSubmitting = false;

  final Map<String, dynamic> _formData = {
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
  };

  final List<String> _steps = [
    'Find Business',
    'Field Discovery',
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

  void _nextStep() {
    if (_currentStep < _steps.length - 1) {
      setState(() {
        _currentStep++;
      });
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
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
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              labelText: 'Search Business',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() {
                          _searchController.clear();
                          _placePredictions = [];
                          _selectedPlace = null;
                          _formData['companyName'] = '';
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
          const SizedBox(height: 16),
          if (_selectedPlace != null)
            Card(
              color: const Color(0xFF095c7b).withOpacity(0.1),
              child: ListTile(
                leading: const Icon(Icons.business, color: Color(0xFF095c7b)),
                title: Text(_selectedPlace!['name'] ?? ''),
                subtitle: Text(_selectedPlace!['formatted_address'] ?? ''),
                trailing: const Icon(Icons.check_circle, color: Color(0xFF095c7b)),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
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
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDiscoveryStep() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Discovery Signals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 8),
        _buildMultiSelect(
          'Select all that apply',
          [
            'Pays for Australia Post',
            'Staff Handle Post',
            'Drop-off is a hassle',
            'Banking Runs',
            'Inter-office Deliveries',
            'Needs same-day Delivery',
            'Uses Australia Post',
            'Uses other couriers (<5kg)',
            'Uses other couriers (100+ per week)',
            'Shopify / WooCommerce',
            'Other label platforms',
            'Decisions made at Head Office',
          ],
          'discoverySignals',
        ),
        const SizedBox(height: 24),
        const Text('Occurrence', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        _buildRadioGroup(
          ['Daily', 'Weekly', 'Ad-hoc'],
          'occurrence',
        ),
        const SizedBox(height: 24),
        const Text('Inconvenience', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        _buildRadioGroup(
          ['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue'],
          'inconvenience',
        ),
        const SizedBox(height: 24),
        const Text('Task Owner', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        _buildRadioGroup(
          ['Shared admin responsibility', 'Dedicated staff role', 'Ad-hoc / whoever is free'],
          'taskOwner',
        ),
        const SizedBox(height: 24),
        const Text('Lost Property Process', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        _buildRadioGroup(
          [
            'Staff organise returns manually',
            'Guests contact us to arrange shipping',
            'Rarely happens / informal process',
            'Already use a return platform'
          ],
          'lostPropertyProcess',
        ),
      ],
    );
  }

  Widget _buildMultiSelect(String title, List<String> options, String key) {
    final List<String> selected = List<String>.from(_formData[key] ?? []);
    return Wrap(
      spacing: 8,
      children: options.map((option) {
        final isSelected = selected.contains(option);
        return FilterChip(
          label: Text(option),
          selected: isSelected,
          onSelected: (bool value) {
            setState(() {
              if (value) {
                selected.add(option);
              } else {
                selected.remove(option);
              }
              _formData[key] = selected;
            });
          },
          selectedColor: const Color(0xFF095c7b).withOpacity(0.2),
          checkmarkColor: const Color(0xFF095c7b),
        );
      }).toList(),
    );
  }

  Widget _buildRadioGroup(List<String> options, String key) {
    return Column(
      children: options.map((option) {
        return RadioListTile<String>(
          title: Text(option),
          value: option,
          groupValue: _formData[key],
          onChanged: (String? value) {
            setState(() {
              _formData[key] = value;
            });
          },
          activeColor: const Color(0xFF095c7b),
        );
      }).toList(),
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
              ElevatedButton.icon(
                onPressed: () async {
                  final XFile? image = await _imageService.pickImageFromCamera();
                  if (image != null) {
                    setState(() {
                      (_formData['images'] as List<XFile>).add(image);
                    });
                  }
                },
                icon: const Icon(Icons.camera_alt),
                label: const Text('Add Photo'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFeaf143),
                  foregroundColor: const Color(0xFF095c7b),
                ),
              ),
            ],
          ),
          if ((_formData['images'] as List<XFile>).isNotEmpty)
            Container(
              height: 100,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: (_formData['images'] as List<XFile>).length,
                itemBuilder: (context, index) {
                  final image = (_formData['images'] as List<XFile>)[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: Stack(
                      children: [
                        Image.file(File(image.path), width: 80, height: 80, fit: BoxFit.cover),
                        Positioned(
                          right: -10,
                          top: -10,
                          child: IconButton(
                            icon: const Icon(Icons.cancel, color: Colors.red),
                            onPressed: () {
                              setState(() {
                                (_formData['images'] as List<XFile>).removeAt(index);
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
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
          style: TextStyle(fontSize: 16, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        ...outcomes.map((outcome) {
          final isSelected = _formData['outcomeType'] == outcome['label'];
          return Padding(
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
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(
                    color: isSelected ? (outcome['bg'] as Color) : Colors.grey[300]!,
                    width: 1,
                  ),
                ),
              ),
              child: Text(
                outcome['label'] as String,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          );
        }).toList(),
        
        if (['Qualified - Set Appointment', 'Qualified - Call Back/Send Info', 'Upsell']
            .contains(_formData['outcomeType']))
          _buildOutcomeFields(),
      ],
    );
  }

  Widget _buildOutcomeFields() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Divider(),
          const SizedBox(height: 16),
          const Text('Contact Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 16),
          TextField(
            decoration: const InputDecoration(labelText: 'Contact Name', border: OutlineInputBorder()),
            onChanged: (val) => _formData['personSpokenWithName'] = val,
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Contact Email', border: OutlineInputBorder()),
            onChanged: (val) => _formData['personSpokenWithEmail'] = val,
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Contact Phone', border: OutlineInputBorder()),
            onChanged: (val) => _formData['personSpokenWithPhone'] = val,
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoStep() {
    final List<XFile> images = _formData['images'] as List<XFile>;
    
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Capture business cards, shipping labels, or store fronts.',
          style: TextStyle(fontSize: 16, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        Center(
          child: Column(
            children: [
              ElevatedButton.icon(
                onPressed: () async {
                  final XFile? image = await _imageService.pickImageFromCamera();
                  if (image != null) {
                    setState(() {
                      images.add(image);
                    });
                  }
                },
                icon: const Icon(Icons.camera_alt),
                label: const Text('Take Photo'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF095c7b),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () async {
                  final List<XFile>? selectedImages = await _imageService.pickMultiImages();
                  if (selectedImages != null) {
                    setState(() {
                      images.addAll(selectedImages);
                    });
                  }
                },
                icon: const Icon(Icons.upload_file),
                label: const Text('Upload Files'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        if (images.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.5,
            ),
            itemCount: images.length,
            itemBuilder: (context, index) {
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: kIsWeb 
                      ? Image.network(images[index].path, fit: BoxFit.cover)
                      : Image.file(File(images[index].path), fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => setState(() => images.removeAt(index)),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 16, color: Colors.white),
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
    final scoredData = DiscoveryScoringService.calculateScoreAndRouting(_formData);
    final score = scoredData['score'] ?? 0;
    final routingTag = scoredData['routingTag'] ?? 'N/A';
    final reason = scoredData['scoringReason'] ?? 'N/A';

    final List<XFile> images = _formData['images'] as List<XFile>;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: const Color(0xFF095c7b).withOpacity(0.05),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                const Text(
                  'AI Opportunity Score',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  '$score%',
                  style: const TextStyle(
                    color: Color(0xFF095c7b),
                    fontWeight: FontWeight.bold,
                    fontSize: 48,
                  ),
                ),
                const SizedBox(height: 8),
                Chip(
                  label: Text('Routing: $routingTag'),
                  backgroundColor: const Color(0xFFeaf143),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text('Scoring Reason', style: TextStyle(fontWeight: FontWeight.bold)),
        Text(reason),
        const SizedBox(height: 24),
        const Text('Visit Details', style: TextStyle(fontWeight: FontWeight.bold)),
        Text('Business: ${_formData['companyName'] ?? 'No business selected'}'),
        const SizedBox(height: 8),
        Text('Note: ${_formData['content'] ?? 'No notes captured'}'),
        const SizedBox(height: 8),
        Text('Outcome: ${_formData['outcomeType'] ?? 'No outcome selected'}'),
        if (images.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Text('Photos', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SizedBox(
            height: 80,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: images.length,
              itemBuilder: (context, index) {
                final image = images[index];
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: kIsWeb 
                      ? Image.network(image.path, width: 80, height: 80, fit: BoxFit.cover)
                      : Image.file(File(image.path), width: 80, height: 80, fit: BoxFit.cover),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
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
            onPressed: _isSubmitting
                ? null
                : () {
                    if (_currentStep < _steps.length - 1) {
                      _nextStep();
                    } else {
                      _submitForm();
                    }
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF095c7b),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            ),
            child: _isSubmitting && _currentStep == _steps.length - 1
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    _currentStep < _steps.length - 1 ? 'NEXT' : 'SUBMIT',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
          ),
        ],
      ),
    );
  }

  void _submitForm() async {
    if (_isSubmitting) return;

    if (_currentUserProfile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error: User profile not loaded. Please try again.')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      // 1. Prepare images as data URLs (matching Next.js parity)
      final List<String> imageUrls = [];
      for (final image in (_formData['images'] as List<XFile>)) {
        final bytes = await image.readAsBytes();
        final base64Image = base64Encode(bytes);
        imageUrls.add('data:image/jpeg;base64,$base64Image');
      }

      // 2. Score logic
      final scoredDiscoveryData = DiscoveryScoringService.calculateScoreAndRouting(_formData);
      
      // 3. Save to Firestore
      final visitNoteData = {
        'content': _formData['content'],
        'capturedBy': _currentUserProfile?.displayName ?? 'Unknown User',
        'capturedByUid': _currentUserProfile?.id,
        'franchisee': _currentUserProfile?.franchisee,
        'imageUrls': imageUrls,
        'googlePlaceId': _selectedPlace?['place_id'],
        'companyName': _selectedPlace?['name'],
        'address': _selectedPlace?['formatted_address'],
        'websiteUrl': _selectedPlace?['website'],
        'outcome': {
          'type': _formData['outcomeType'],
          'details': {}, // Can add details here if needed
        },
        'discoveryData': scoredDiscoveryData,
      };

      await _firestoreService.addVisitNote(visitNoteData);

      // 4. Sync with NetSuite
      final discoveryAnswers = scoredDiscoveryData.entries
          .map((e) {
            final key = e.key.toString().replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(0)}').trim();
            final value = e.value is List ? (e.value as List).join(', ') : e.value.toString();
            return '${key[0].toUpperCase()}${key.substring(1)}: $value';
          })
          .where((s) => s.isNotEmpty)
          .join('\n');

      final nsResult = await _netSuiteService.sendVisitNote(
        capturedBy: _currentUserProfile?.displayName ?? 'Unknown User',
        outcome: _formData['outcomeType'] ?? 'Unknown',
        companyName: _selectedPlace?['name'] ?? 'Unknown Company',
        discoveryAnswers: discoveryAnswers,
      );

      if (mounted) {
        if (nsResult['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Visit Note Submitted and Synced with NetSuite')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Visit Note Saved, but Sync Failed: ${nsResult['message']}')),
          );
        }
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error submitting visit note: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}
