import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MarkerUtils {
  static const Map<String, Color> mapColors = {
    'Won': Color(0xFF34A853), // Green
    'In Progress': Color(0xFF4285F4), // Blue
    'Qualified': Color(0xFFFBBC05), // Yellow
    'Lost': Color(0xFFEA4335), // Red
    'Selected': Color(0xFF7030A0), // Purple
    'Default': Color(0xFF46BDC6), // Light Blue
  };

  static Color getColorForStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'won':
      case 'signed':
        return mapColors['Won']!;
      case 'in progress':
      case 'contacted':
      case 'connected':
        return mapColors['In Progress']!;
      case 'qualified':
      case 'pre qualified':
      case 'trialing shipmate':
        return mapColors['Qualified']!;
      case 'lost':
      case 'unqualified':
      case 'lost customer':
        return mapColors['Lost']!;
      default:
        return mapColors['Default']!;
    }
  }

  static Future<BitmapDescriptor> createCustomMarkerBitmap(Color color, {int size = 100}) async {
    final ui.PictureRecorder pictureRecorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    final Paint paint = Paint()..color = color;
    final Paint shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    // Draw Pin Shape
    final double radius = size / 2.5;
    final Path path = Path();
    
    // Circle at top
    path.addOval(Rect.fromLTWH(size * 0.1, 0, size * 0.8, size * 0.8));
    
    // Triangle at bottom (pointy bit)
    path.moveTo(size * 0.5 - radius, size * 0.4);
    path.lineTo(size * 0.5 + radius, size * 0.4);
    path.lineTo(size * 0.5, size.toDouble());
    path.close();

    // Draw shadow
    canvas.drawPath(path, shadowPaint);
    
    // Draw main pin
    canvas.drawPath(path, paint);

    // Draw white circle in center
    canvas.drawCircle(
      Offset(size * 0.5, size * 0.4),
      size * 0.15,
      Paint()..color = Colors.white,
    );

    final ui.Image image = await pictureRecorder.endRecording().toImage(size, size);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(data!.buffer.asUint8List());
  }
}
