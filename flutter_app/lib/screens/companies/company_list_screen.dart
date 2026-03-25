import 'package:flutter/material.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import 'company_detail_screen.dart';
import '../reports/signed_customers_screen.dart';

class CompanyListScreen extends StatefulWidget {
  const CompanyListScreen({super.key});

  @override
  State<CompanyListScreen> createState() => _CompanyListScreenState();
}

class _CompanyListScreenState extends State<CompanyListScreen> {
  final _firestoreService = FirestoreService();
  List<Lead> _allCompanies = [];
  List<Lead> _filteredCompanies = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadCompanies();
  }

  Future<void> _loadCompanies() async {
    setState(() => _isLoading = true);
    try {
      final companies = await _firestoreService.getCompanies();
      setState(() {
        _allCompanies = companies;
        _applyFilter();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading companies: $e')),
        );
      }
    }
  }

  void _applyFilter() {
    setState(() {
      if (_searchQuery.isEmpty) {
        _filteredCompanies = _allCompanies;
      } else {
        _filteredCompanies = _allCompanies
            .where((c) => c.companyName.toLowerCase().contains(_searchQuery.toLowerCase()))
            .toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Signed Customers'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              onChanged: (value) {
                _searchQuery = value;
                _applyFilter();
              },
              decoration: InputDecoration(
                hintText: 'Search companies...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadCompanies,
              child: _filteredCompanies.isEmpty
                  ? const Center(child: Text('No companies found'))
                  : ListView.builder(
                      itemCount: _filteredCompanies.length,
                      itemBuilder: (context, index) {
                        final company = _filteredCompanies[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Color(0xFF095c7b),
                              child: Icon(Icons.business, color: Colors.white),
                            ),
                            title: Text(
                              company.companyName,
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text(
                              company.address?['city'] ?? company.franchisee ?? 'No Location',
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => CompanyDetailScreen(company: company),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const SignedCustomersScreen()),
          );
        },
        backgroundColor: const Color(0xFF095c7b),
        child: const Icon(Icons.map, color: Colors.white),
      ),
    );
  }
}
