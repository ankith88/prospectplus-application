class Address {
  final String street;
  final String? address1;
  final String city;
  final String state;
  final String zip;
  final String country;
  final double? lat;
  final double? lng;

  Address({
    required this.street,
    this.address1,
    required this.city,
    required this.state,
    required this.zip,
    this.country = 'Australia',
    this.lat,
    this.lng,
  });

  factory Address.fromMap(Map<String, dynamic> data) {
    double? parseCoord(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    return Address(
      street: data['street'] ?? '',
      address1: data['address1'],
      city: data['city'] ?? '',
      state: data['state'] ?? '',
      zip: data['zip'] ?? '',
      country: data['country'] ?? 'Australia',
      lat: parseCoord(data['lat']),
      lng: parseCoord(data['lng']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'street': street,
      'address1': address1,
      'city': city,
      'state': state,
      'zip': zip,
      'country': country,
      'lat': lat,
      'lng': lng,
    };
  }

  String get fullAddress {
    final parts = [address1, street, city, state, zip].where((e) => e != null && e.isNotEmpty).toList();
    return parts.join(', ');
  }
}
