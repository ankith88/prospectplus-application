'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FranchiseProspect } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserCheck, Mail, Phone, MapPin, Calendar, Clock, FileText, Plus, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';

export default function FranchiseProspectsClient() {
  const { toast } = useToast();
  const { userProfile, isSuperAdmin } = useAuth();

  const activeRole = userProfile?.activeRole || userProfile?.role || '';
  const isAllowed = isSuperAdmin || ['admin', 'super user', 'Operations', 'operations', 'Outbound Admin'].includes(activeRole);

  const [prospects, setProspects] = useState<FranchiseProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<FranchiseProspect | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  // Notes state
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Convert to Franchisee User Dialog
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [prefillUserData, setPrefillUserData] = useState<any>(null);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, 'franchise_prospects'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const list: FranchiseProspect[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FranchiseProspect, 'id'>),
      }));
      setProspects(list);
    } catch (error) {
      console.error('Failed to fetch franchise prospects:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load franchise prospects.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        p.fullName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.preferredTerritory?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesState = stateFilter === 'all' || p.preferredState?.toUpperCase() === stateFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesState;
    });
  }, [prospects, searchTerm, statusFilter, stateFilter]);

  const metrics = useMemo(() => {
    const total = prospects.length;
    const newCount = prospects.filter((p) => p.status === 'New').length;
    const underReview = prospects.filter((p) => p.status === 'Under Review' || p.status === 'Contacted').length;
    const converted = prospects.filter((p) => p.status === 'Converted').length;
    return { total, newCount, underReview, converted };
  }, [prospects]);

  const handleUpdateStatus = async (prospectId: string, newStatus: FranchiseProspect['status']) => {
    setUpdatingStatus(true);
    try {
      const ref = doc(firestore, 'franchise_prospects', prospectId);
      await updateDoc(ref, { status: newStatus });
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, status: newStatus } : p))
      );
      if (selectedProspect && selectedProspect.id === prospectId) {
        setSelectedProspect((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast({ title: 'Status Updated', description: `Prospect status changed to ${newStatus}.` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedProspect || !newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: newNoteText.trim(),
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };
      const updatedNotes = [...(selectedProspect.notes || []), newNote];
      const ref = doc(firestore, 'franchise_prospects', selectedProspect.id);
      await updateDoc(ref, { notes: updatedNotes });

      setSelectedProspect({ ...selectedProspect, notes: updatedNotes });
      setProspects((prev) =>
        prev.map((p) => (p.id === selectedProspect.id ? { ...p, notes: updatedNotes } : p))
      );
      setNewNoteText('');
      toast({ title: 'Note Added', description: 'Follow-up note logged successfully.' });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not log note.' });
    } finally {
      setAddingNote(false);
    }
  };

  const handleStartConvert = (prospect: FranchiseProspect) => {
    setPrefillUserData({
      firstName: prospect.firstName || prospect.fullName.split(' ')[0] || '',
      lastName: prospect.lastName || prospect.fullName.split(' ').slice(1).join(' ') || '',
      email: prospect.email,
      mobileNumber: prospect.phone,
      phoneNumber: prospect.phone,
      role: 'Franchisee',
    });
    setIsConvertDialogOpen(true);
  };

  const getStatusBadge = (status: FranchiseProspect['status']) => {
    switch (status) {
      case 'New':
        return <Badge className="bg-blue-600 text-white font-medium">New</Badge>;
      case 'Contacted':
        return <Badge className="bg-amber-500 text-white font-medium">Contacted</Badge>;
      case 'Under Review':
        return <Badge className="bg-purple-600 text-white font-medium">Under Review</Badge>;
      case 'Converted':
        return <Badge className="bg-emerald-600 text-white font-medium">Converted</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'Archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAllowed) {
    return <AccessDenied customPageName="Franchise Prospects" />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Franchise Prospects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage expressions of interest from potential franchisee buyers submitted via mailplus.com.au
          </p>
        </div>
        <Button variant="outline" onClick={fetchProspects} disabled={loading} className="gap-2 border-[#095c7b] text-[#095c7b]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#095c7b] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.newCount}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Under Review / Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.underReview}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Converted to Franchisee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.converted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by applicant name, email, phone, or territory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="NSW">NSW</SelectItem>
                <SelectItem value="VIC">VIC</SelectItem>
                <SelectItem value="QLD">QLD</SelectItem>
                <SelectItem value="SA">SA</SelectItem>
                <SelectItem value="WA">WA</SelectItem>
                <SelectItem value="TAS">TAS</SelectItem>
                <SelectItem value="ACT">ACT</SelectItem>
                <SelectItem value="NT">NT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden border">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader />
            <p className="text-sm text-muted-foreground">Loading franchise prospects...</p>
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-lg">No franchise prospects found</p>
            <p className="text-sm">Try clearing search or changing status filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Applicant Name</TableHead>
                <TableHead className="font-bold text-slate-700">Contact Details</TableHead>
                <TableHead className="font-bold text-slate-700">Preferred Territory / State</TableHead>
                <TableHead className="font-bold text-slate-700">Submitted Date</TableHead>
                <TableHead className="font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.map((prospect) => (
                <TableRow key={prospect.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="font-semibold text-slate-900">
                    <div>{prospect.fullName}</div>
                    <span className="text-xs text-muted-foreground font-normal">Source: {prospect.sourceApp || 'Website'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs space-y-1">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-[#095c7b]" />
                        {prospect.email}
                      </span>
                      {prospect.phone && (
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {prospect.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{prospect.preferredTerritory || 'Unspecified'}</span>
                      {prospect.preferredState && (
                        <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5">
                          {prospect.preferredState.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {prospect.submittedAt ? new Date(prospect.submittedAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}
                  </TableCell>
                  <TableCell>{getStatusBadge(prospect.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProspect(prospect)}
                        className="h-8 text-xs border-slate-300"
                      >
                        View & Manage
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartConvert(prospect)}
                        className="h-8 text-xs bg-[#095c7b] hover:bg-[#074760] text-white gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Convert
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Prospect Detail Modal */}
      <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProspect && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#095c7b]">{selectedProspect.fullName}</DialogTitle>
                    <DialogDescription>Franchise Application Details</DialogDescription>
                  </div>
                  <div>{getStatusBadge(selectedProspect.status)}</div>
                </div>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                {/* Contact & Territory Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Email</span>
                    <span className="font-medium text-slate-800">{selectedProspect.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Phone</span>
                    <span className="font-medium text-slate-800">{selectedProspect.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Preferred Territory</span>
                    <span className="font-medium text-slate-800">{selectedProspect.preferredTerritory || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Preferred State</span>
                    <span className="font-medium text-slate-800">{selectedProspect.preferredState || 'Not specified'}</span>
                  </div>
                </div>

                {/* Message */}
                {selectedProspect.message && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Applicant Message</h4>
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-md text-sm text-slate-800 leading-relaxed italic">
                      "{selectedProspect.message}"
                    </div>
                  </div>
                )}

                {/* Status Updater */}
                <div className="p-4 border rounded-lg bg-white space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change Application Status</h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(['New', 'Contacted', 'Under Review', 'Converted', 'Rejected', 'Archived'] as FranchiseProspect['status'][]).map(
                      (st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant={selectedProspect.status === st ? 'default' : 'outline'}
                          disabled={updatingStatus}
                          onClick={() => handleUpdateStatus(selectedProspect.id, st)}
                          className={selectedProspect.status === st ? 'bg-[#095c7b]' : ''}
                        >
                          {st}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {/* Follow-up Notes Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Operations Notes & Log</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{selectedProspect.notes?.length || 0} notes</span>
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {!selectedProspect.notes || selectedProspect.notes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No follow-up notes logged yet.</p>
                    ) : (
                      selectedProspect.notes.map((note) => (
                        <div key={note.id} className="p-3 bg-slate-50 border rounded-md text-xs space-y-1">
                          <div className="flex justify-between items-center text-slate-500 font-medium">
                            <span>{note.createdByName}</span>
                            <span>{new Date(note.createdAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-800 leading-normal">{note.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Input
                      placeholder="Log a call or follow-up note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      className="text-sm"
                    />
                    <Button onClick={handleAddNote} disabled={addingNote || !newNoteText.trim()} className="bg-[#095c7b] hover:bg-[#074760]">
                      Add Note
                    </Button>
                  </div>
                </div>

                {/* Conversion Action */}
                <div className="pt-4 border-t flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedProspect(null)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      const p = selectedProspect;
                      setSelectedProspect(null);
                      handleStartConvert(p);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <UserCheck className="h-4 w-4" />
                    Convert to Franchisee User
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to User Dialog */}
      {isConvertDialogOpen && (
        <CreateUserDialog
          isOpen={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          onUserCreated={() => {
            fetchProspects();
            toast({ title: 'Conversion Complete', description: 'Franchisee user account created successfully.' });
          }}
        />
      )}
    </div>
  );
}
