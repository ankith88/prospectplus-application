import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'firebase_options.dart';
import 'models/lead.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'services/auth_service.dart';
import 'theme/app_theme.dart';

import 'screens/leads/outbound_leads_screen.dart';
import 'screens/field_activity/field_sales_dashboard_screen.dart';
import 'screens/field_activity/visit_notes_list_screen.dart';
import 'screens/routes/prospecting_areas_screen.dart';
import 'screens/leads/new_lead_screen.dart';
import 'screens/maps/prospecting_map_screen.dart';
import 'screens/reports/signed_customers_screen.dart';
import 'screens/leads/lead_list_screen.dart';
import 'screens/field_activity/capture_visit_screen.dart';
import 'screens/routes/route_list_screen.dart';
import 'screens/reports/reports_dashboard_screen.dart';
import 'screens/reports/field_activity_report_screen.dart';
import 'screens/appointments/appointment_list_screen.dart';
import 'screens/field_activity/transcripts_screen.dart';
import 'screens/field_activity/check_in_screen.dart';
import 'screens/reports/outbound_report_screen.dart';

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
        '/leads/map': (context) => const ProspectingMapScreen(),
        '/signed-customers': (context) => const SignedCustomersScreen(),
        '/leads/archive': (context) => const LeadListScreen(initialStatusFilter: 'Archived'),
        '/capture-visit': (context) => const CaptureVisitScreen(),
        '/saved-routes': (context) => const RouteListScreen(),
        '/reports': (context) => const ReportsDashboardScreen(),
        '/field-activity-report': (context) => const FieldActivityReportScreen(),
        '/outbound-reporting': (context) => const OutboundReportScreen(),
        '/appointments': (context) => const AppointmentListScreen(),
        '/calls': (context) => const TranscriptsScreen(),
        '/transcripts': (context) => const TranscriptsScreen(),
        '/check-ins': (context) {
          final args = ModalRoute.of(context)?.settings.arguments;
          if (args is Lead) {
            return CheckInScreen(lead: args);
          }
          return const VisitNotesListScreen();
        },
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
