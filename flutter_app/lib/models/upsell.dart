class Upsell {
  final String id;
  final String companyId;
  final String companyName;
  final String repName;
  final String repUid;
  final DateTime date;
  final String serviceType;
  final double? amount;

  Upsell({
    required this.id,
    required this.companyId,
    required this.companyName,
    required this.repName,
    required this.repUid,
    required this.date,
    required this.serviceType,
    this.amount,
  });

  factory Upsell.fromMap(Map<String, dynamic> data, String id) {
    double? parseAmount(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    String? asString(dynamic value) {
      if (value == null) return null;
      return value.toString();
    }

    return Upsell(
      id: id,
      companyId: asString(data['companyId']) ?? '',
      companyName: asString(data['companyName']) ?? '',
      repName: asString(data['repName']) ?? '',
      repUid: asString(data['repUid']) ?? '',
      date: data['date'] != null ? DateTime.parse(data['date']) : DateTime.now(),
      serviceType: asString(data['serviceType']) ?? '',
      amount: parseAmount(data['amount']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'companyId': companyId,
      'companyName': companyName,
      'repName': repName,
      'repUid': repUid,
      'date': date.toIso8601String(),
      'serviceType': serviceType,
      'amount': amount,
    };
  }
}
