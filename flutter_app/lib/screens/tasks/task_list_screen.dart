import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/task.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  final _firestoreService = FirestoreService();
  final _authService = AuthService();
  List<Task> _tasks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final user = await _authService.user.first;
      if (user != null) {
        final tasks = await _firestoreService.getAllUserTasks(user.displayName ?? user.email ?? '');
        setState(() {
          _tasks = tasks;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading tasks: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final overdue = _tasks.where((t) => !t.isCompleted && _isOverdue(t.dueDate)).toList();
    final upcoming = _tasks.where((t) => !t.isCompleted && !_isOverdue(t.dueDate)).toList();
    final completed = _tasks.where((t) => t.isCompleted).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tasks'),
        backgroundColor: const Color(0xFF095c7b),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTasks,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildSection('Overdue', overdue, Colors.red),
                  const SizedBox(height: 16),
                  _buildSection('Upcoming', upcoming, Colors.blue),
                  const SizedBox(height: 16),
                  _buildSection('Completed', completed, Colors.green),
                ],
              ),
            ),
    );
  }

  bool _isOverdue(String dueDate) {
    final date = DateTime.tryParse(dueDate);
    if (date == null) return false;
    final now = DateTime.now();
    return date.isBefore(DateTime(now.year, now.month, now.day));
  }

  Widget _buildSection(String title, List<Task> tasks, Color color) {
    return Card(
      child: ExpansionTile(
        initiallyExpanded: title != 'Completed',
        title: Row(
          children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Text('${tasks.length}', style: TextStyle(fontSize: 12, color: color)),
            ),
          ],
        ),
        children: tasks.isEmpty
            ? [const ListTile(title: Text('No tasks here', style: TextStyle(fontSize: 14, color: Colors.grey)))]
            : tasks.map((task) => _buildTaskTile(task)).toList(),
      ),
    );
  }

  Widget _buildTaskTile(Task task) {
    final date = DateTime.tryParse(task.dueDate);
    final dateStr = date != null ? DateFormat.yMMMd().format(date) : task.dueDate;

    return ListTile(
      leading: Checkbox(
        value: task.isCompleted,
        onChanged: (value) async {
          if (task.leadId != null) {
            await _firestoreService.updateTaskCompletion(task.leadId!, task.id, value!);
            _loadTasks();
          }
        },
      ),
      title: Text(task.title, style: TextStyle(
        decoration: task.isCompleted ? TextDecoration.lineThrough : null,
      )),
      subtitle: Text('Lead: ${task.leadName ?? 'Unknown'} • Due: $dateStr'),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, color: Colors.grey),
        onPressed: () => _deleteTask(task),
      ),
    );
  }

  void _deleteTask(Task task) async {
    if (task.leadId == null) return;
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed == true) {
      await _firestoreService.deleteTaskFromLead(task.leadId!, task.id);
      _loadTasks();
    }
  }
}
