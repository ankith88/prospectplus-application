import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class DiscoveryRadarChart extends StatelessWidget {
  final Map<String, dynamic> discoveryData;

  const DiscoveryRadarChart({super.key, required this.discoveryData});

  List<RadarEntry> _getChartData() {
    final List<double> scores = [0, 0, 0, 0, 0];
    final signals = discoveryData['discoverySignals'] as List? ?? [];

    // Service Fit
    if (signals.contains('Pays for Australia Post')) scores[0] += 40;
    if (signals.contains('Staff Handle Post')) scores[0] += 30;
    if (signals.contains('Drop-off is a hassle')) scores[0] += 30;
    if (signals.contains('Banking Runs')) scores[0] += 20;
    if (signals.contains('Inter-office Deliveries')) scores[0] += 20;

    // Product Fit
    if (signals.contains('Uses other couriers (<5kg)')) scores[1] += 40;
    if (signals.contains('Uses other couriers (100+ per week)')) scores[1] += 40;
    if (signals.contains('Uses Australia Post')) scores[1] += 30;
    if (signals.contains('Shopify / WooCommerce')) scores[1] += 20;

    // Inconvenience
    final inconvenience = discoveryData['inconvenience'];
    if (inconvenience == 'Very inconvenient') {
      scores[2] = 100;
    } else if (inconvenience == 'Somewhat inconvenient') {
      scores[2] = 60;
    } else if (inconvenience == 'Not a big issue') {
      scores[2] = 20;
    }

    // Occurrence
    final occurrence = discoveryData['occurrence'];
    if (occurrence == 'Daily') {
      scores[3] = 100;
    } else if (occurrence == 'Weekly') {
      scores[3] = 60;
    } else if (occurrence == 'Ad-hoc') {
      scores[3] = 30;
    }

    // Task Ownership
    final taskOwner = discoveryData['taskOwner'];
    if (taskOwner == 'Dedicated staff role') {
      scores[4] = 100;
    } else if (taskOwner == 'Shared admin responsibility') {
      scores[4] = 60;
    } else if (taskOwner == 'Ad-hoc / whoever is free') {
      scores[4] = 30;
    }

    return scores.map((s) => RadarEntry(value: s.clamp(0, 100).toDouble())).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 300,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: RadarChart(
        RadarChartData(
          dataSets: [
            RadarDataSet(
              fillColor: const Color(0xFF095c7b).withOpacity(0.2),
              borderColor: const Color(0xFF095c7b),
              entryRadius: 2,
              dataEntries: _getChartData(),
            ),
          ],
          radarShape: RadarShape.circle,
          radarBackgroundColor: Colors.transparent,
          borderData: FlBorderData(show: false),
          radarBorderData: const BorderSide(color: Colors.grey, width: 0.5),
          titlePositionPercentageOffset: 0.2,
          titleTextStyle: const TextStyle(color: Colors.black54, fontSize: 10, fontWeight: FontWeight.bold),
          getTitle: (index, angle) {
            switch (index) {
              case 0: return const RadarChartTitle(text: 'Service Fit');
              case 1: return const RadarChartTitle(text: 'Product Fit');
              case 2: return const RadarChartTitle(text: 'Inconvenience');
              case 3: return const RadarChartTitle(text: 'Occurrence');
              case 4: return const RadarChartTitle(text: 'Task Ownership');
              default: return const RadarChartTitle(text: '');
            }
          },
          tickCount: 5,
          ticksTextStyle: const TextStyle(color: Colors.transparent, fontSize: 10),
          gridBorderData: const BorderSide(color: Colors.grey, width: 0.5),
        ),
      ),
    );
  }
}
