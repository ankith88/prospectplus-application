import 'package:flutter/material.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../../services/speech_service.dart';
import '../../services/discovery_scoring_service.dart';
import '../../widgets/layout/main_layout.dart';

class CheckInScreen extends StatefulWidget {
  final Lead lead;

  const CheckInScreen({super.key, required this.lead});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  int _currentStep = 0;
  final _firestoreService = FirestoreService();
  final _speechService = SpeechService();
  final _noteController = TextEditingController();

  final Map<String, dynamic> _formData = {
    'discoverySignals': <String>[],
    'inconvenience': null,
    'occurrence': null,
    'recurring': null,
    'contacts': <Map<String, String>>[],
  };

  bool _isSpeechInitialized = false;

  @override
  void initState() {
    super.initState();
    _initSpeech();
    _loadExistingDiscovery();
  }

  Future<void> _initSpeech() async {
    _isSpeechInitialized = await _speechService.initialize();
  }

  void _loadExistingDiscovery() {
    if (widget.lead.discoveryData != null) {
      setState(() {
        _formData['discoverySignals'] = List<String>.from(widget.lead.discoveryData!['discoverySignals'] ?? []);
        _formData['inconvenience'] = widget.lead.discoveryData!['inconvenience'];
        _formData['occurrence'] = widget.lead.discoveryData!['occurrence'];
        _formData['recurring'] = widget.lead.discoveryData!['recurring'];
      });
    }
  }

  void _nextStep() {
    if (_currentStep < 3) {
      setState(() => _currentStep++);
    } else {
      _submitCheckIn();
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    }
  }

  Future<void> _submitCheckIn() async {
    try {
      final scoredData = DiscoveryScoringService.calculateScoreAndRouting(_formData);
      
      // Update Lead Discovery Data
      final updatedLead = widget.lead.copyWith(discoveryData: scoredData);
      await _firestoreService.updateLead(updatedLead);

      // Log Activity
      await _firestoreService.logActivity(widget.lead.id, {
        'type': 'Update',
        'notes': 'Check-in discovery completed for ${widget.lead.companyName}.',
        'discoveryScore': scoredData['score'],
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Check-in completed successfully!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error saving check-in: $e')));
      }
    } finally {
      // Done saving
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.of(context).size.width < 1024;

    return MainLayout(
      title: 'Check-In: ${widget.lead.companyName}',
      currentRoute: '/check-ins',
      showHeader: false,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Check-In: ${widget.lead.companyName}'),
          backgroundColor: const Color(0xFF095c7b),
          foregroundColor: Colors.white,
          leading: isMobile ? Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ) : IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Stepper(
          currentStep: _currentStep,
          onStepContinue: _nextStep,
          onStepCancel: _prevStep,
          controlsBuilder: (context, details) {
            return Padding(
              padding: const EdgeInsets.only(top: 20),
              child: Row(
                children: [
                  ElevatedButton(
                    onPressed: details.onStepContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF095c7b),
                      foregroundColor: Colors.white,
                    ),
                    child: Text(_currentStep == 3 ? 'Finish' : 'Next'),
                  ),
                  if (_currentStep > 0)
                    TextButton(
                      onPressed: details.onStepCancel,
                      child: const Text('Back'),
                    ),
                ],
              ),
            );
          },
          steps: [
            Step(
              title: const Text('Discovery Signals'),
              content: _buildDiscoverySignals(),
              isActive: _currentStep >= 0,
            ),
            Step(
              title: const Text('Pain Points'),
              content: _buildPainPoints(),
              isActive: _currentStep >= 1,
            ),
            Step(
              title: const Text('Contacts'),
              content: _buildContacts(),
              isActive: _currentStep >= 2,
            ),
            Step(
              title: const Text('Notes'),
              content: _buildNotes(),
              isActive: _currentStep >= 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiscoverySignals() {
    final signals = [
      'Visible Parcels',
      'Shipping Labels',
      'Daily Pickups',
      'Warehousing',
      'Ecommerce',
      'High Value Goods',
    ];
    return Column(
      children: signals.map((s) => CheckboxListTile(
        title: Text(s),
        value: (_formData['discoverySignals'] as List).contains(s),
        onChanged: (val) {
          setState(() {
            if (val == true) {
              (_formData['discoverySignals'] as List).add(s);
            } else {
              (_formData['discoverySignals'] as List).remove(s);
            }
          });
        },
      )).toList(),
    );
  }

  Widget _buildPainPoints() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Inconvenience Level', style: TextStyle(fontWeight: FontWeight.bold)),
        Slider(
          value: (_formData['inconvenience'] ?? 0).toDouble(),
          min: 0,
          max: 10,
          divisions: 10,
          label: _formData['inconvenience']?.toString(),
          onChanged: (val) => setState(() => _formData['inconvenience'] = val.toInt()),
        ),
        const SizedBox(height: 16),
        const Text('Occurrence Frequency', style: TextStyle(fontWeight: FontWeight.bold)),
        DropdownButton<String>(
          value: _formData['occurrence'],
          isExpanded: true,
          hint: const Text('Select frequency'),
          items: ['Daily', 'Weekly', 'Monthly', 'Occasional'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
          onChanged: (val) => setState(() => _formData['occurrence'] = val),
        ),
      ],
    );
  }

  Widget _buildContacts() {
    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: _addContact,
          icon: const Icon(Icons.add),
          label: const Text('Add Contact'),
        ),
        ...(_formData['contacts'] as List).map((c) => ListTile(
          title: Text(c['name'] ?? 'No Name'),
          subtitle: Text(c['title'] ?? 'No Title'),
          trailing: IconButton(icon: const Icon(Icons.delete), onPressed: () => setState(() => (_formData['contacts'] as List).remove(c))),
        )),
      ],
    );
  }

  Widget _buildNotes() {
    return Column(
      children: [
        TextField(
          controller: _noteController,
          maxLines: 5,
          decoration: InputDecoration(
            hintText: 'Add visit notes...',
            border: const OutlineInputBorder(),
            suffixIcon: IconButton(
              icon: Icon(_speechService.isListening ? Icons.mic : Icons.mic_none),
              onPressed: _isSpeechInitialized ? _toggleSpeech : null,
            ),
          ),
        ),
      ],
    );
  }

  void _addContact() {
    // Show dialog to add contact
  }

  void _toggleSpeech() {
    if (_speechService.isListening) {
      _speechService.stopListening();
      setState(() {});
    } else {
      _speechService.startListening((text) {
        setState(() => _noteController.text = text);
      });
      setState(() {});
    }
  }
}
