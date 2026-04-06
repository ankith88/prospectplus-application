import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ErrorUtils {
  static final _urlRegex = RegExp(r'(https?://[^\s]+)');

  static void showSnackBar(
    BuildContext context,
    String message, {
    Color? backgroundColor,
    Duration duration = const Duration(seconds: 4),
  }) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    // Clear existing snackbars to prevent overlapping
    scaffoldMessenger.hideCurrentSnackBar();

    final urlMatch = _urlRegex.firstMatch(message);
    final String? url = urlMatch?.group(0);

    scaffoldMessenger.showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
        duration: url != null ? const Duration(seconds: 10) : duration,
        action: url != null
            ? SnackBarAction(
                label: 'OPEN LINK',
                onPressed: () async {
                  final uri = Uri.parse(url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                textColor: Colors.white,
              )
            : null,
      ),
    );
  }
}
