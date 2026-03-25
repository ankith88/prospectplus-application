class DiscoveryScoringService {
  static Map<String, dynamic> calculateScoreAndRouting(Map<String, dynamic> data) {
    final List<String> discoverySignals = List<String>.from(data['discoverySignals'] ?? []);
    final String? inconvenience = data['inconvenience'];
    final String? occurrence = data['occurrence'];
    final String? taskOwner = data['taskOwner'];
    final List<String> personSpokenWithTags = List<String>.from(data['personSpokenWithTags'] ?? []);
    final String? decisionMakerName = data['decisionMakerName'];
    final String? lostPropertyProcess = data['lostPropertyProcess'];

    final List<String> reasonParts = [];

    // --- Discovery Score ---
    int groupAScore = 0;
    if (discoverySignals.contains('Pays for Australia Post')) {
      groupAScore = 6;
      reasonParts.add('+6 for paying for AP services.');
    } else if (discoverySignals.contains('Staff Handle Post')) {
      groupAScore = 5;
      reasonParts.add('+5 for staff handling post.');
    }

    int groupBScore = 0;
    if (discoverySignals.contains('Drop-off is a hassle')) {
      groupBScore += 6;
      reasonParts.add('+6 for drop-off hassle.');
    }
    if (discoverySignals.contains('Banking Runs')) {
      groupBScore += 4;
      reasonParts.add('+4 for banking runs.');
    }
    if (discoverySignals.contains('Inter-office Deliveries')) {
      groupBScore += 4;
      reasonParts.add('+4 for inter-office deliveries.');
    }
    if (discoverySignals.contains('Needs same-day Delivery')) {
      groupBScore += 3;
      reasonParts.add('+3 for same-day needs.');
    }

    int groupCScore = 0;
    if (discoverySignals.contains('Uses Australia Post')) {
      groupCScore += 3;
      reasonParts.add('+3 for using AP products.');
    }
    if (discoverySignals.contains('Uses other couriers (<5kg)')) {
      groupCScore += 2;
      reasonParts.add('+2 for using other small couriers.');
    }
    if (discoverySignals.contains('Uses other couriers (100+ per week)')) {
      groupCScore += 2;
      reasonParts.add('+2 for high volume with other couriers.');
    }
    if (discoverySignals.contains('Shopify / WooCommerce')) {
      groupCScore += 1;
      reasonParts.add('+1 for Shopify/Woo.');
    }
    if (discoverySignals.contains('Other label platforms')) {
      groupCScore -= 2;
      reasonParts.add('-2 for other label platforms.');
    }

    // --- Lost Property (Dashback) ---
    String dashbackOpportunity = '';
    if (lostPropertyProcess != null) {
      if (lostPropertyProcess == 'Staff organise returns manually' ||
          lostPropertyProcess == 'Guests contact us to arrange shipping') {
        groupCScore += 2;
        dashbackOpportunity = 'High';
        reasonParts.add('+2 for High Dashback Opportunity.');
      } else if (lostPropertyProcess == 'Rarely happens / informal process') {
        groupCScore += 1;
        dashbackOpportunity = 'Medium';
        reasonParts.add('+1 for Medium Dashback Opportunity.');
      } else if (lostPropertyProcess == 'Already use a return platform') {
        dashbackOpportunity = 'Low / Competitor';
        reasonParts.add('Low Dashback Opportunity (Competitor).');
      }
    }

    final int discoveryScore = groupAScore + groupBScore + groupCScore;

    // --- Qualification Score ---
    int q1Score = 0;
    if (inconvenience == 'Very inconvenient') {
      q1Score = 5;
    } else if (inconvenience == 'Somewhat inconvenient') {
      q1Score = 2;
    } else if (inconvenience == 'Not a big issue') {
      q1Score = 1;
    }
    if (q1Score > 0) reasonParts.add('+$q1Score for inconvenience level.');

    int q2Score = 0;
    if (occurrence == 'Daily') {
      q2Score = 5;
    } else if (occurrence == 'Weekly') {
      q2Score = 3;
    } else if (occurrence == 'Ad-hoc') {
      q2Score = 1;
    }
    if (q2Score > 0) reasonParts.add('+$q2Score for occurrence frequency.');

    int q3Score = 0;
    if (taskOwner == 'Shared admin responsibility') {
      q3Score = 5;
    } else if (taskOwner == 'Dedicated staff role') {
      q3Score = 3;
    } else if (taskOwner == 'Ad-hoc / whoever is free') {
      q3Score = 1;
    }
    if (q3Score > 0) reasonParts.add('+$q3Score for task ownership.');

    int q4Score = 0;
    if (personSpokenWithTags.contains('Decision Maker')) {
      q4Score = 5;
    } else if (decisionMakerName != null && decisionMakerName.isNotEmpty) {
      q4Score = 3;
    } else {
      q4Score = 1;
    }
    if (q4Score > 0) reasonParts.add('+$q4Score for decision maker access.');

    final int qualificationScore = q1Score + q2Score + q3Score + q4Score;

    // --- Final Score & Routing ---
    final int finalScore = (discoveryScore * (qualificationScore / 10)).round();

    if (discoverySignals.contains('Decisions made at Head Office')) {
      final Map<String, dynamic> result = Map<String, dynamic>.from(data);
      result.addAll({
        'score': finalScore.clamp(0, 100),
        'routingTag': 'Corporate',
        'scoringReason': 'Lead routed to Corporate because decisions are made at Head Office.',
        'dashbackOpportunity': dashbackOpportunity,
      });
      return result;
    }

    final bool servicePoints = discoverySignals.any((s) => [
          'Pays for Australia Post',
          'Staff Handle Post',
          'Drop-off is a hassle',
          'Banking Runs',
          'Inter-office Deliveries',
          'Needs same-day Delivery'
        ].contains(s));
    final bool productPoints = discoverySignals.any((s) => [
          'Uses Australia Post',
          'Uses other couriers (<5kg)',
          'Uses other couriers (100+ per week)',
          'Shopify / WooCommerce',
          'Other label platforms'
        ].contains(s));

    String routingTag = 'Service'; // Default
    if (servicePoints && productPoints) {
      routingTag = 'Service & Product';
    } else if (productPoints) {
      routingTag = 'Product';
    }

    final String scoringReason = reasonParts.isNotEmpty ? reasonParts.join(' ') : 'No specific scoring criteria met.';

    final Map<String, dynamic> result = Map<String, dynamic>.from(data);
    result.addAll({
      'score': finalScore.clamp(0, 100),
      'routingTag': routingTag,
      'scoringReason': scoringReason,
      'dashbackOpportunity': dashbackOpportunity,
    });
    return result;
  }
}
