import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/auth_service.dart';
import '../../widgets/loader.dart';
import '../../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _resetEmailController = TextEditingController();
  final _auth = AuthService();
  bool _isLoading = false;
  bool _isSendingReset = false;

  void _signIn() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      _showErrorSnackBar('Please enter email and password');
      return;
    }

    setState(() => _isLoading = true);
    
    try {
      final user = await _auth.signIn(_emailController.text, _passwordController.text);
      if (user == null) {
        _showErrorSnackBar('Invalid email or password. Please try again.');
      }
    } catch (e) {
      String errorMessage = "An unexpected error occurred. Please check your credentials.";
      final code = e.toString();
      if (code.contains('wrong-password') || code.contains('user-not-found') || code.contains('invalid-credential')) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (code.contains('invalid-email')) {
        errorMessage = "Please enter a valid email address.";
      }
      _showErrorSnackBar(errorMessage);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red[700],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _handlePasswordReset() async {
    if (_resetEmailController.text.isEmpty) {
      _showErrorSnackBar('Please enter your email address.');
      return;
    }

    setState(() => _isSendingReset = true);
    try {
      await _auth.sendPasswordReset(_resetEmailController.text);
    } catch (e) {
      debugPrint('Password reset failed: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isSendingReset = false;
          _resetEmailController.clear();
        });
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('If an account exists for that email, a password reset link has been sent.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showResetPasswordDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Reset Password'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enter your email address below and we\'ll send you a link to reset your password.',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _resetEmailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'm@example.com',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                enabled: !_isSendingReset,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: _isSendingReset ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: _isSendingReset ? null : _handlePasswordReset,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF095c7b),
                foregroundColor: Colors.white,
              ),
              child: _isSendingReset 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                : const Text('Send Reset Link'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchContactEmail() async {
    final Uri emailLaunchUri = Uri(
      scheme: 'mailto',
      path: 'ankith.ravindran@mailplus.com.au',
    );
    if (await canLaunchUrl(emailLaunchUri)) {
      await launchUrl(emailLaunchUri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: AppTheme.background,
          body: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Card(
                  elevation: 8,
                  shadowColor: Colors.black.withOpacity(0.2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.network(
                          'https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png',
                          height: 80,
                          width: 80,
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'ProspectPlus',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.foreground,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Sign in to your account',
                          style: TextStyle(color: Colors.grey, fontSize: 14),
                        ),
                        const SizedBox(height: 32),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Email', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.foreground)),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _emailController,
                              decoration: const InputDecoration(
                                hintText: 'm@example.com',
                              ),
                              keyboardType: TextInputType.emailAddress,
                              enabled: !_isLoading,
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.foreground)),
                                TextButton(
                                  onPressed: _isLoading ? null : _showResetPasswordDialog,
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text(
                                    'Forgot password?', 
                                    style: TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _passwordController,
                              decoration: const InputDecoration(),
                              obscureText: true,
                              enabled: !_isLoading,
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _signIn,
                            child: const Text('Sign In', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'By signing in, you agree to our terms of service.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          alignment: WrapAlignment.center,
                          children: [
                            const Text(
                              'Need access or want to sign up? Contact ',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            GestureDetector(
                              onTap: _launchContactEmail,
                              child: const Text(
                                'Ankith Ravindran',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.bold,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                            const Text(
                              '.',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        if (_isLoading) const FullScreenLoader(message: 'Signing in...'),
      ],
    );
  }
}
