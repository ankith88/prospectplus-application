import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_profile.dart';
import '../models/deployment.dart';
import '../services/firestore_service.dart';
import '../services/netsuite_service.dart';
import '../utils/error_utils.dart';

class DailyDeploymentDialog extends StatefulWidget {
  final UserProfile userProfile;
  final Function(bool) onComplete;

  const DailyDeploymentDialog({
    super.key,
    required this.userProfile,
    required this.onComplete,
  });

  @override
  State<DailyDeploymentDialog> createState() => _DailyDeploymentDialogState();
}

class _DailyDeploymentDialogState extends State<DailyDeploymentDialog> {
  final _formKey = GlobalKey<FormState>();
  final _areaController = TextEditingController();
  final _startTimeController = TextEditingController();
  final _firestoreService = FirestoreService();
  final _netsuiteService = NetSuiteService();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _startTimeController.text = DateFormat('HH:mm').format(DateTime.now());
  }

  @override
  void dispose() {
    _areaController.dispose();
    _startTimeController.dispose();
    super.dispose();
  }

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF095c7b),
              onPrimary: Colors.white,
              onSurface: Color(0xFF095c7b),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _startTimeController.text =
            '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _handleSkip() async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    await prefs.setString('deployment_skipped_date', today);
    widget.onComplete(false);
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      
      final deployment = Deployment(
        userId: widget.userProfile.id,
        userName: widget.userProfile.displayName ?? 'Unknown',
        date: todayStr,
        area: _areaController.text,
        startTime: _startTimeController.text,
      );

      // 1. Save to Firestore
      await _firestoreService.logDailyArea(deployment);

      // 2. Sync to NetSuite
      final syncResult = await _netsuiteService.sendDeployment(
        userId: deployment.userId,
        userName: deployment.userName,
        displayName: widget.userProfile.displayName ?? 'Unknown',
        email: widget.userProfile.email,
        area: deployment.area,
        startTime: deployment.startTime,
        date: deployment.date,
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('deployment_skipped_date');

      if (syncResult['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Deployment logged and synced with NetSuite.')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Saved locally, but NetSuite sync failed: ${syncResult['message']}'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }

      widget.onComplete(true);
    } catch (e) {
      if (mounted) {
        ErrorUtils.showSnackBar(context, 'Failed to log deployment: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.location_on, color: Color(0xFF095c7b)),
                  const SizedBox(width: 8),
                  Text(
                    'Daily Deployment Log',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF095c7b),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Field Sales: Please specify where you are working today. You can skip this if you are just planning.',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _areaController,
                decoration: const InputDecoration(
                  labelText: 'Target Area / Suburb',
                  hintText: 'e.g. Sydney CBD, Parramatta...',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.map_outlined),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter the area name.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _startTimeController,
                readOnly: true,
                onTap: () => _selectTime(context),
                decoration: const InputDecoration(
                  labelText: 'Expected Start Time',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.access_time),
                  suffixIcon: Icon(Icons.keyboard_arrow_down),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your start time.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              Wrap(
                alignment: WrapAlignment.end,
                runSpacing: 12,
                spacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  TextButton(
                    onPressed: _isSubmitting ? null : _handleSkip,
                    child: const Text(
                      'Just Planning (Skip)',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF095c7b),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Confirm Deployment'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
