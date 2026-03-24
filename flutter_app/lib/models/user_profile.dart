class UserProfile {
  final String uid;
  final String email;
  final String? displayName;
  final String? role;
  final String? franchisee;

  UserProfile({
    required this.uid,
    required this.email,
    this.displayName,
    this.role,
    this.franchisee,
  });

  factory UserProfile.fromMap(Map<String, dynamic> data, String uid) {
    return UserProfile(
      uid: uid,
      email: data['email'] ?? '',
      displayName: data['displayName'],
      role: data['role'],
      franchisee: data['franchisee'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'displayName': displayName,
      'role': role,
      'franchisee': franchisee,
    };
  }
}
