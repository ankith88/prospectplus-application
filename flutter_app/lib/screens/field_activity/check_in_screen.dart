import 'package:flutter/material.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../../services/speech_service.dart';
import '../../services/discovery_scoring_service.dart';

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

  bool _isSaving = false;
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
    setState(() => _isSaving = true);
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
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Check-in: ${widget.lead.companyName}'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildProgressIndicator(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _buildCurrentStepView(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildProgressIndicator() {
    final steps = ['Company', 'Contacts', 'Discovery', 'Finish'];
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      color: Colors.grey[50],
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(steps.length, (index) {
          final isActive = index == _currentStep;
          final isCompleted = index < _currentStep;
          return Column(
            children: [
              CircleAvatar(
                radius: 12,
                backgroundColor: isCompleted ? Colors.green : (isActive ? const Color(0xFF095c7b) : Colors.grey[300]),
                child: isCompleted 
                    ? const Icon(Icons.check, size: 14, color: Colors.white) 
                    : Text('${index + 1}', style: const TextStyle(fontSize: 10, color: Colors.white)),
              ),
              const SizedBox(height: 4),
              Text(steps[index], style: TextStyle(fontSize: 10, color: isActive ? const Color(0xFF095c7b) : Colors.grey)),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case 0: return _buildCompanyDetails();
      case 1: return _buildContactDetails();
      case 2: return _buildFieldDiscovery();
      case 3: return _buildSummaryStep();
      default: return const SizedBox.shrink();
    }
  }

  Widget _buildCompanyDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Company Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        _buildReadOnlyField('Business Name', widget.lead.companyName),
        const SizedBox(height: 12),
        _buildReadOnlyField('Address', widget.lead.address != null ? '${widget.lead.address!['city'] ?? ''}, ${widget.lead.address!['state'] ?? ''}' : 'N/A'),
        const SizedBox(height: 24),
        const Text('Voice Note (Optional)', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextField(
          controller: _noteController,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Add a quick voice note or manual note...',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: _isSpeechInitialized ? () {
            if (_speechService.isListening) {
              _speechService.stopListening();
              setState(() {});
            } else {
              _speechService.startListening((text) {
                setState(() {
                  _noteController.text = '${_noteController.text} $text'.trim();
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
    );
  }

  Widget _buildReadOnlyField(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        const Divider(),
      ],
    );
  }

  Widget _buildContactDetails() {
    final contacts = (widget.lead.contacts) ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Existing Contacts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        if (contacts.isEmpty)
          const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('No existing contacts found.'))
        else
          ...contacts.map((c) => Card(
            child: ListTile(
              title: Text(c['name'] ?? 'N/A'),
              subtitle: Text(c['title'] ?? 'N/A'),
              trailing: const Icon(Icons.check_circle_outline, color: Colors.green),
            ),
          )),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: _showAddContactDialog,
          icon: const Icon(Icons.person_add),
          label: const Text('Add New Contact'),
        ),
      ],
    );
  }

  void _showAddContactDialog() {
    final nameController = TextEditingController();
    final titleController = TextEditingController();
    final emailController = TextEditingController();
    final phoneController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Contact'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Name')),
              TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Title')),
              TextField(controller: emailController, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
              TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Phone'), keyboardType: TextInputType.phone),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty) {
                setState(() {
                  (_formData['contacts'] as List).add({
                    'name': nameController.text,
                    'title': titleController.text,
                    'email': emailController.text,
                    'phone': phoneController.text,
                  });
                });
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF095c7b), foregroundColor: Colors.white),
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Widget _buildFieldDiscovery() {
    final signals = [
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
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Field Discovery', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        const Text('Discovery Signals'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: signals.map((s) {
            final isSelected = (_formData['discoverySignals'] as List).contains(s);
            return FilterChip(
              label: Text(s, style: const TextStyle(fontSize: 12)),
              selected: isSelected,
              onSelected: (val) {
                setState(() {
                  if (val) {
                    (_formData['discoverySignals'] as List).add(s);
                  } else {
                    (_formData['discoverySignals'] as List).remove(s);
                  }
                });
              },
              selectedColor: const Color(0xFF095c7b).withOpacity(0.2),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        _buildRadioSection('Inconvenience', ['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue'], 'inconvenience'),
        const SizedBox(height: 24),
        _buildRadioSection('Occurrence', ['Daily', 'Weekly', 'Ad-hoc'], 'occurrence'),
        const SizedBox(height: 24),
        _buildRadioSection('Is this recurring?', ['Yes - predictable', 'Sometimes', 'One-off'], 'recurring'),
      ],
    );
  }

  Widget _buildRadioSection(String title, List<String> options, String key) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        ...options.map((o) => RadioListTile<String>(
          title: Text(o),
          value: o,
          groupValue: _formData[key],
          onChanged: (val) => setState(() => _formData[key] = val),
          contentPadding: EdgeInsets.zero,
          dense: true,
        )),
      ],
    );
  }

  Widget _buildSummaryStep() {
    final scoredData = DiscoveryScoringService.calculateScoreAndRouting(_formData);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const Icon(Icons.assessment, size: 64, color: Color(0xFF095c7b)),
        const SizedBox(height: 16),
        const Text('Discovery Analysis', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildScoreItem('Score', '${scoredData['score']}%'),
            _buildScoreItem('Routing', scoredData['routingTag'] ?? 'N/A'),
          ],
        ),
        const SizedBox(height: 32),
        const Text('Ready to finalize this check-in?', style: TextStyle(color: Colors.grey)),
      ],
    );
  }

  Widget _buildScoreItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF095c7b))),
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
            ElevatedButton(onPressed: _prevStep, child: const Text('Back'))
          else
            const SizedBox.shrink(),
          ElevatedButton(
            onPressed: _isSaving ? null : _nextStep,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF095c7b), foregroundColor: Colors.white),
            child: _isSaving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text(_currentStep == 3 ? 'Finalize' : 'Continue'),
          ),
        ],
      ),
    );
  }
}
