import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'firebase_options.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'services/auth_service.dart';
import 'theme/app_theme.dart';

import 'screens/leads/outbound_leads_screen.dart';
import 'screens/field_activity/field_sales_dashboard_screen.dart';
import 'screens/field_activity/visit_notes_list_screen.dart';
import 'screens/routes/prospecting_areas_screen.dart';
import 'screens/leads/new_lead_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MailPlus CRM',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      routes: {
        '/': (context) => const AuthWrapper(),
        '/admin/dashboard': (context) => const DashboardScreen(),
        '/leads': (context) => const OutboundLeadsScreen(),
        '/field-sales': (context) => const FieldSalesDashboardScreen(),
        '/visit-notes': (context) => const VisitNotesListScreen(),
        '/prospecting-areas': (context) => const ProspectingAreasScreen(),
        '/leads/new': (context) {
          final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
          return NewLeadScreen(fromVisitNoteId: args?['fromVisitNoteId']);
        },
      },
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: AuthService().user,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasData) {
          return const DashboardScreen();
        }
        return const LoginScreen();
      },
    );
  }
}
