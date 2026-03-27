import '../../models/visit_note.dart';
import '../../models/lead.dart';
import '../../models/appointment.dart';
import '../../models/upsell.dart';
import '../../models/user_profile.dart';

class ReportStats {
  final List<VisitNote> filteredNotes;
  final List<Lead> allLeads;
  final List<Appointment> allAppointments;
  final List<Upsell> allUpsells;
  final List<UserProfile> allUsers;
  final List<Map<String, dynamic>> allActivities;
  final Set<String> companyIds;

  ReportStats({
    required this.filteredNotes,
    required this.allLeads,
    required this.allAppointments,
    required this.allUpsells,
    required this.allUsers,
    required this.allActivities,
    required this.companyIds,
  });

  // Summary Counts
  int get totalVisits => filteredNotes.length;
  int get convertedCount => filteredNotes.where((n) => n.status == 'Converted').length;
  int get pendingCount => filteredNotes.where((n) => n.status == 'New' || n.status == 'In Progress').length;
  int get rejectedCount => filteredNotes.where((n) => n.status == 'Rejected').length;
  int get linkedToExistingCount => filteredNotes.where((n) => n.status == 'Converted' && n.leadId != null && companyIds.contains(n.leadId)).length;

  // Outcome Groups
  int get apptNoteCount => filteredNotes.where((n) => n.outcome['type']?.toString().contains('Appointment') ?? false).length;
  int get followupNoteCount => filteredNotes.where((n) => n.outcome['type']?.toString().contains('Follow-up') ?? false).length;
  int get negativeNoteCount => filteredNotes.where((n) => 
    (n.outcome['type']?.toString().contains('Not Interested') ?? false) || 
    (n.outcome['type']?.toString().contains('Current Supplier') ?? false)
  ).length;

  // Appointment Funnel
  List<VisitNote> get apptVisits => filteredNotes.where((n) => n.outcome['type']?.toString().contains('Appointment') ?? false).toList();
  List<VisitNote> get pendingApptConversionVisits => apptVisits.where((n) => n.status != 'Converted').toList();
  
  List<Lead> get apptConvertedLeads {
    final apptNoteIds = apptVisits.map((n) => n.leadId).toSet();
    return allLeads.where((l) => apptNoteIds.contains(l.id)).toList();
  }

  List<Lead> get leadsConvertedWithAppt {
    final apptLeadIds = apptConvertedLeads.map((l) => l.id).toSet();
    return allLeads.where((l) => 
      apptLeadIds.contains(l.id) && 
      allAppointments.any((a) => a.leadId == l.id && a.appointmentStatus == 'Completed')
    ).toList();
  }

  // Commission Metrics
  List<Map<String, dynamic>> get commissionEligibleEvents {
    final events = <Map<String, dynamic>>[];
    
    // 1. Converted with Completed Appointments
    for (var lead in leadsConvertedWithAppt) {
      events.add({
        'id': lead.id,
        'companyName': lead.companyName,
        'milestone': 'Appointment Success',
        'capturedBy': (lead.salesRepAssigned ?? 'Unknown'),
        'date': lead.dateLeadEntered,
      });
    }

    // 2. Upsells (Sync with web: any upsell in the period)
    for (var upsell in allUpsells) {
      events.add({
        'id': upsell.id,
        'companyName': upsell.companyName,
        'milestone': 'Upsell Success',
        'capturedBy': upsell.repName,
        'date': upsell.date,
      });
    }

    // 3. Outbound Wins (Leads sourced from field, transitioned to outbound, and now Won)
    final wonLeads = allLeads.where((l) => 
      l.status == 'Won' && 
      l.visitNoteID != null && 
      l.visitNoteID!.isNotEmpty && 
      l.fieldSales == false
    );
    for (var lead in wonLeads) {
      events.add({
        'id': lead.id,
        'companyName': lead.companyName,
        'milestone': 'Outbound Win',
        'capturedBy': (lead.salesRepAssigned ?? 'Unknown'),
        'date': lead.dateLeadEntered,
      });
    }
    
    return events;
  }

  double get totalCommission {
    // Web Logic: (apptSuccessCount + outboundWinsCount + upsellCount) * 50
    return commissionEligibleEvents.length * 50.0;
  }

  // Conversion Efficiency (of Converted Notes)
  List<Lead> get convertedLeads => filteredNotes
      .where((n) => n.status == 'Converted' && n.leadId != null)
      .map((n) => allLeads.firstWhere((l) => l.id == n.leadId, orElse: () => Lead(id: '', companyName: 'Unknown', status: 'New', profile: '')))
      .where((l) => l.id.isNotEmpty)
      .toList();

  int get efficiencyWonCount => convertedLeads.where((l) => l.status == 'Won').length;
  int get efficiencyQualifiedCount => convertedLeads.where((l) => l.status == 'Qualified' || l.status == 'Pre Qualified').length;
  int get efficiencyQuoteCount => convertedLeads.where((l) => l.status == 'Quote Sent' || l.status == 'Prospect Opportunity').length;

  // Chart Data
  Map<String, int> get outcomeDistribution {
    final distribution = <String, int>{};
    for (var note in filteredNotes) {
      final type = note.outcome['type']?.toString() ?? 'Other';
      distribution[type] = (distribution[type] ?? 0) + 1;
    }
    return distribution;
  }

  // Rep Stats
  List<Map<String, dynamic>> get repStats {
    final stats = <String, Map<String, dynamic>>{};
    
    for (var note in filteredNotes) {
      final rep = note.capturedBy;
      if (!stats.containsKey(rep)) {
        stats[rep] = {
          'name': rep,
          'visits': 0,
          'converted': 0,
          'appointments': 0,
          'commission': 0.0,
          'outcomes': <String, int>{},
        };
      }
      stats[rep]!['visits']++;
      if (note.status == 'Converted') stats[rep]!['converted']++;
      
      final type = note.outcome['type']?.toString() ?? 'Other';
      final outcomes = stats[rep]!['outcomes'] as Map<String, int>;
      outcomes[type] = (outcomes[type] ?? 0) + 1;
    }

    // Add commissions to rep stats
    for (var event in commissionEligibleEvents) {
      final rep = event['capturedBy'];
      if (stats.containsKey(rep)) {
        double val = 0;
        if (event['milestone'] == 'Appointment Success') val = 50.0;
        if (event['milestone'] == 'Upsell Success') val = 50.0;
        if (event['milestone'] == 'Outbound Win') val = 10.0;
        stats[rep]!['commission'] += val;
      }
    }

    return stats.values.toList()..sort((a, b) => b['visits'].compareTo(a['visits']));
  }
}
