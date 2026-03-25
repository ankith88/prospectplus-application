import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/lead.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class CompanyDetailScreen extends StatefulWidget {
  final Lead company;

  const CompanyDetailScreen({super.key, required this.company});

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _firestoreService = FirestoreService();
  bool _isLoadingInvoices = true;
  List<Map<String, dynamic>> _invoices = [];
  List<Map<String, dynamic>> _activities = [];
  bool _isLoadingActivities = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadInvoices();
    _loadActivities();
  }

  Future<void> _loadInvoices() async {
    final invoices = await _firestoreService.getInvoices(widget.company.id);
    if (mounted) {
      setState(() {
        _invoices = invoices;
        _isLoadingInvoices = false;
      });
    }
  }

  Future<void> _loadActivities() async {
    // In a real app, you'd fetch this from a subcollection
    // For now, we'll try to get it if it exists in the model or fetch it
    final snapshot = await _firestoreService.db
        .collection('companies')
        .doc(widget.company.id)
        .collection('activity')
        .orderBy('date', descending: true)
        .get();
    
    if (mounted) {
      setState(() {
        _activities = snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList();
        _isLoadingActivities = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.company.companyName),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: const Color(0xFFeaf143),
          tabs: const [
            Tab(text: 'Details'),
            Tab(text: 'Invoices'),
            Tab(text: 'Activity'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDetailsTab(),
          _buildInvoicesTab(),
          _buildActivityTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showUpsellDialog,
        backgroundColor: const Color(0xFF095c7b),
        icon: const Icon(Icons.trending_up, color: Colors.white),
        label: const Text('Record Upsell', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoCard('Company Info', [
            _buildDetailRow(Icons.fingerprint, 'Customer ID', widget.company.entityId ?? 'N/A'),
            _buildDetailRow(Icons.numbers, 'NetSuite ID', widget.company.internalid ?? 'N/A'),
            _buildDetailRow(Icons.business, 'Franchisee', widget.company.franchisee ?? 'N/A'),
            _buildDetailRow(Icons.category, 'Industry', widget.company.industryCategory ?? 'N/A'),
            _buildDetailRow(Icons.email, 'Email', widget.company.customerServiceEmail ?? 'N/A'),
            _buildDetailRow(Icons.phone, 'Phone', widget.company.customerPhone ?? 'N/A'),
          ]),
          const SizedBox(height: 16),
          _buildInfoCard('Contacts', widget.company.contacts?.map((c) => 
            _buildContactRow(c['name'] ?? 'N/A', c['title'] ?? 'N/A', c['email'] ?? 'N/A', c['phone'] ?? 'N/A')
          ).toList() ?? [const Text('No contacts found')]),
          const SizedBox(height: 16),
          _buildAddressCard(),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String title, List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF095c7b))),
            const Divider(),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text('$label:', style: const TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(color: Colors.black87))),
        ],
      ),
    );
  }

  Widget _buildContactRow(String name, String title, String email, String phone) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.email, size: 14, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(email, style: const TextStyle(fontSize: 12)),
              const Spacer(),
              Icon(Icons.phone, size: 14, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(phone, style: const TextStyle(fontSize: 12)),
            ],
          ),
          const Divider(),
        ],
      ),
    );
  }

  Widget _buildAddressCard() {
    final street = widget.company.address?['street'] ?? 'N/A';
    final city = widget.company.address?['city'] ?? '';
    final state = widget.company.address?['state'] ?? '';
    final zip = widget.company.address?['zip'] ?? '';
    final addressStr = '$street, $city $state $zip'.trim();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF095c7b))),
            const Divider(),
            Row(
              children: [
                const Icon(Icons.location_on, size: 20, color: Colors.grey),
                const SizedBox(width: 12),
                Expanded(child: Text(addressStr)),
              ],
            ),
            const SizedBox(height: 16),
            if (widget.company.latitude != null && widget.company.longitude != null)
              SizedBox(
                height: 200,
                width: double.infinity,
                child: GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: LatLng(widget.company.latitude!, widget.company.longitude!),
                    zoom: 15,
                  ),
                  markers: {
                    Marker(
                      markerId: MarkerId(widget.company.id),
                      position: LatLng(widget.company.latitude!, widget.company.longitude!),
                      infoWindow: InfoWindow(title: widget.company.companyName),
                    ),
                  },
                  myLocationEnabled: false,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: true,
                ),
              )
            else
              Container(
                height: 200,
                width: double.infinity,
                color: Colors.grey[200],
                child: const Center(child: Text('Location coordinates missing')),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoicesTab() {
    if (_isLoadingInvoices) return const Center(child: CircularProgressIndicator());
    if (_invoices.isEmpty) return const Center(child: Text('No invoices found'));

    return ListView.builder(
      itemCount: _invoices.length,
      itemBuilder: (context, index) {
        final inv = _invoices[index];
        final date = inv['invoiceDate'] != null ? DateFormat.yMMMd().format(DateTime.parse(inv['invoiceDate'])) : 'N/A';
        final amount = inv['invoiceTotal']?.toString() ?? '0.00';

        return ListTile(
          leading: const Icon(Icons.description, color: Color(0xFF095c7b)),
          title: Text('Invoice #${inv['invoiceDocumentID'] ?? 'N/A'}'),
          subtitle: Text(date),
          trailing: Text('\$$amount', style: const TextStyle(fontWeight: FontWeight.bold)),
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Viewing Invoice PDF #${inv['invoiceDocumentID']} (Feature coming soon)'),
                duration: const Duration(seconds: 2),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildActivityTab() {
    if (_isLoadingActivities) return const Center(child: CircularProgressIndicator());
    if (_activities.isEmpty) return const Center(child: Text('No recent activity'));

    return ListView.builder(
      itemCount: _activities.length,
      itemBuilder: (context, index) {
        final act = _activities[index];
        final date = act['date'] != null ? DateFormat.yMMMd().add_jm().format(DateTime.parse(act['date'])) : 'N/A';

        return ListTile(
          leading: Icon(_getActivityIcon(act['type']), color: Colors.grey[600]),
          title: Text(act['notes'] ?? 'No notes'),
          subtitle: Text('$date by ${act['author'] ?? 'Unknown'}'),
        );
      },
    );
  }

  IconData _getActivityIcon(String? type) {
    switch (type) {
      case 'Call': return Icons.phone;
      case 'Email': return Icons.email;
      case 'Visit': return Icons.business;
      case 'Upsell': return Icons.trending_up;
      default: return Icons.info_outline;
    }
  }

  void _showUpsellDialog() {
    final notesController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Record Upsell'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Mark this customer as successfully upsold.'),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                labelText: 'Upsell Details',
                hintText: 'e.g., Added parcel delivery service',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final user = await AuthService().user.first; // Get current user
              if (user != null) {
                await _firestoreService.logUpsell({
                  'companyId': widget.company.id,
                  'companyName': widget.company.companyName,
                  'repUid': user.uid,
                  'repName': user.displayName ?? 'Unknown',
                  'date': DateTime.now().toIso8601String(),
                  'notes': notesController.text,
                });
                if (!mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upsell recorded!')));
                _loadActivities(); // Refresh activity
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF095c7b), foregroundColor: Colors.white),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }
}
