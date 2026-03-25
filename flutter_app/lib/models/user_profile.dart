class UserProfile {
  final String id;
  final String email;
  final String? displayName;
  final String? firstName;
  final String? role;
  final String? franchisee;
  final String? linkedSalesRep;
  final String? phoneNumber;

  UserProfile({
    required this.id,
    required this.email,
    this.displayName,
    this.firstName,
    this.role,
    this.franchisee,
    this.linkedSalesRep,
    this.phoneNumber,
  });

  factory UserProfile.fromMap(Map<String, dynamic> data, String id) {
    String? asString(dynamic value) {
      if (value == null) return null;
      return value.toString();
    }

    return UserProfile(
      id: id,
      email: asString(data['email']) ?? '',
      displayName: asString(data['displayName']),
      firstName: asString(data['firstName'] ?? data['displayName']?.toString().split(' ').first),
      role: asString(data['role']),
      franchisee: asString(data['franchisee']),
      linkedSalesRep: asString(data['linkedSalesRep']),
      phoneNumber: asString(data['phoneNumber']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'displayName': displayName,
      'role': role,
      'franchisee': franchisee,
      'linkedSalesRep': linkedSalesRep,
      'phoneNumber': phoneNumber,
    };
  }
}
