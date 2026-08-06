'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FranchiseProspect, ProspectEmailLog } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserCheck, Mail, Phone, MapPin, Calendar, Clock, FileText, Plus, CheckCircle, RefreshCw, Paperclip, Send, X, History, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TERRITORY_OPTIONS = [
  { group: 'NSW', items: ['Arncliffe, NSW', 'Hunter Valley, NSW', 'Macquarie Park, NSW', 'Mascot, NSW', 'Newcastle, NSW', 'Northern Beaches, NSW', 'Waterloo, NSW'] },
  { group: 'ACT', items: ['Barton, ACT', 'Canberra Airport, ACT'] },
  { group: 'QLD', items: ['Darra, QLD', 'Townsville, QLD'] },
  { group: 'VIC', items: ['Geelong, VIC', 'Hallam, VIC', 'Hoppers Crossing, VIC', 'Sunshine, VIC', 'Lalor, VIC'] },
  { group: 'TAS', items: ['Launceston, TAS', 'Hobart, TAS'] },
];

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

  // Add Prospect Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingNewProspect, setSubmittingNewProspect] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredTerritory: '',
    customTerritory: '',
    interest: '',
    vehicle: '',
    experience: '',
    employment: '',
    message: '',
    sendBrochureImmediately: true,
  });

  // Send Email / Brochure Modal State
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailTargetProspect, setEmailTargetProspect] = useState<FranchiseProspect | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [includeBrochure, setIncludeBrochure] = useState(true);
  const [additionalFiles, setAdditionalFiles] = useState<Array<{ name: string; url: string; size?: number }>>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

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

      // Refresh currently selected prospect if open
      if (selectedProspect) {
        const updated = list.find((p) => p.id === selectedProspect.id);
        if (updated) setSelectedProspect(updated);
      }
    } catch (error) {
      console.error('Failed to fetch franchise prospects:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load franchise prospects.' });
    } finally {
      setLoading(false);
    }
  };

  // Presales state for territory dropdown & IM preview
  const [presaleRecords, setPresaleRecords] = useState<any[]>([]);
  const [presaleTerritories, setPresaleTerritories] = useState<Array<{ name: string; state?: string; id?: string }>>([]);

  const fetchPresales = async () => {
    try {
      const res = await fetch('/api/franchisees/presales');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPresaleRecords(json.data);
        const list: Array<{ name: string; state?: string; id?: string }> = [];
        json.data.forEach((p: any) => {
          const tName = p.presalesDetails?.territoryName || p.mainDetails?.tradingEntity || p.franchiseeName;
          const tState = p.mainDetails?.state || p.presalesDetails?.state || '';
          if (tName && tName !== p.id) {
            if (!list.some((item) => item.name.toLowerCase() === tName.toLowerCase())) {
              list.push({ name: tName, state: tState, id: p.id });
            }
          }
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setPresaleTerritories(list);
      }
    } catch (err) {
      console.error('Failed to load presales for dropdown:', err);
    }
  };

  useEffect(() => {
    fetchProspects();
    fetchPresales();
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

  // Handle Add Prospect Form Submit
  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      toast({ variant: 'destructive', title: 'Missing Name', description: 'First name and last name are required.' });
      return;
    }
    if (!addForm.email.trim() && !addForm.phone.trim()) {
      toast({ variant: 'destructive', title: 'Missing Contact', description: 'Email or phone number is required.' });
      return;
    }

    setSubmittingNewProspect(true);
    try {
      const finalTerritory =
        addForm.preferredTerritory === 'OTHER'
          ? addForm.customTerritory.trim()
          : addForm.preferredTerritory === 'NONE'
          ? ''
          : addForm.preferredTerritory;

      const payload = {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        preferredTerritory: finalTerritory,
        interest: addForm.interest,
        vehicle: addForm.vehicle,
        experience: addForm.experience,
        employment: addForm.employment,
        message: addForm.message.trim(),
        sendBrochureImmediately: addForm.sendBrochureImmediately,
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      const res = await fetch('/api/franchise-prospects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create prospect');
      }

      toast({
        title: 'Prospect Added',
        description: json.brochureSent
          ? 'Franchise prospect created & Brochure PDF emailed (Step 1 complete).'
          : 'Franchise prospect created successfully.',
      });

      setIsAddModalOpen(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        preferredTerritory: '',
        customTerritory: '',
        interest: '',
        vehicle: '',
        experience: '',
        employment: '',
        message: '',
        sendBrochureImmediately: true,
      });

      fetchProspects();
    } catch (error: any) {
      console.error('Error creating prospect:', error);
      toast({ variant: 'destructive', title: 'Create Failed', description: error.message || 'Could not add prospect.' });
    } finally {
      setSubmittingNewProspect(false);
    }
  };

  // Open Send Email Modal
  const handleOpenSendEmail = (prospect: FranchiseProspect, isStep1Brochure: boolean = false) => {
    setEmailTargetProspect(prospect);
    setIncludeBrochure(true);
    setAdditionalFiles([]);
    const territoryText = prospect.preferredTerritory ? ` in ${prospect.preferredTerritory}` : '';

    if (isStep1Brochure || !prospect.brochureSent) {
      setEmailSubject(`MailPlus Franchise Opportunity - Information Brochure${territoryText}`);
      setEmailMessage(
        `Thank you for your interest in owning a MailPlus franchise${territoryText}.\n\nPlease find attached our official MailPlus Franchise Information Brochure (Step 1) detailing our mobile B2B express logistics model, revenue streams, and head office support.\n\nPlease don't hesitate to reach out if you have any questions or would like to discuss available run locations.`
      );
    } else {
      setEmailSubject(`MailPlus Franchise Opportunity - Information & Next Steps`);
      setEmailMessage(`Hi ${prospect.firstName || prospect.fullName},\n\nFollowing up on your franchise enquiry. Please find attached additional information for your review.`);
    }

    setIsSendEmailModalOpen(true);
  };

  // Handle Custom File Upload for Email Attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setAdditionalFiles((prev) => [
            ...prev,
            {
              name: file.name,
              url: dataUrl,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove Additional File Attachment
  const handleRemoveFile = (index: number) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Send Email Action
  const handleSendEmail = async () => {
    if (!emailTargetProspect) return;
    if (!emailTargetProspect.email) {
      toast({ variant: 'destructive', title: 'No Email', description: 'Prospect does not have a valid email address.' });
      return;
    }

    setSendingEmail(true);
    try {
      const payload = {
        prospectId: emailTargetProspect.id,
        subject: emailSubject,
        customMessage: emailMessage,
        includeBrochure,
        additionalAttachments: additionalFiles,
        senderUid: userProfile?.uid || 'system',
        senderName: userProfile?.displayName || userProfile?.email || 'MailPlus Operations',
      };

      const res = await fetch('/api/franchise-prospects/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to send email.');
      }

      toast({
        title: 'Email Sent & Logged',
        description: json.simulated
          ? 'Email simulated and saved to prospect history.'
          : 'Email sent successfully with attachments and logged to history.',
      });

      setIsSendEmailModalOpen(false);
      fetchProspects();
    } catch (error: any) {
      console.error('Error dispatching email:', error);
      toast({ variant: 'destructive', title: 'Send Failed', description: error.message || 'Could not send email.' });
    } finally {
      setSendingEmail(false);
    }
  };

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
            Manage franchisee expressions of interest, send the Franchise Brochure (Step 1), and log email history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#095c7b] hover:bg-[#074760] text-white gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Prospect
          </Button>
          <Button variant="outline" onClick={fetchProspects} disabled={loading} className="gap-2 border-[#095c7b] text-[#095c7b]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
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
            <p className="text-sm">Try clearing search, changing status filters, or adding a new prospect.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Applicant Name</TableHead>
                <TableHead className="font-bold text-slate-700">Contact Details</TableHead>
                <TableHead className="font-bold text-slate-700">Territory / State</TableHead>
                <TableHead className="font-bold text-slate-700">Step 1: Brochure</TableHead>
                <TableHead className="font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.map((prospect) => (
                <TableRow key={prospect.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="font-semibold text-slate-900">
                    <div>{prospect.fullName}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                      <span>Source: {prospect.sourceApp || 'Website'}</span>
                      {prospect.interest && <span className="text-[#095c7b]">• {prospect.interest}</span>}
                    </div>
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
                  <TableCell>
                    {prospect.brochureSent ? (
                      <div className="flex flex-col gap-0.5">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 w-fit gap-1 text-[11px]">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          Brochure Sent
                        </Badge>
                        {prospect.brochureSentAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(prospect.brochureSentAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenSendEmail(prospect, true)}
                        className="h-7 text-xs text-[#095c7b] border-[#095c7b] hover:bg-[#095c7b]/10 gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Send Brochure
                      </Button>
                    )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProspect && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#095c7b]">{selectedProspect.fullName}</DialogTitle>
                    <DialogDescription>Franchise Prospect Details & Communication History</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedProspect.status)}
                    <Button
                      size="sm"
                      onClick={() => handleOpenSendEmail(selectedProspect)}
                      className="bg-[#095c7b] hover:bg-[#074760] text-white gap-1.5 text-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Email / Brochure
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                {/* Contact & Profile Grid matching /become-a-franchisee */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">First Name</span>
                    <span className="font-medium text-slate-800">{selectedProspect.firstName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Last Name</span>
                    <span className="font-medium text-slate-800">{selectedProspect.lastName || 'N/A'}</span>
                  </div>
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
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Applicant Type</span>
                    <span className="font-medium text-slate-800">{selectedProspect.interest || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Has Vehicle?</span>
                    <span className="font-medium text-slate-800">{selectedProspect.vehicle || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Experience</span>
                    <span className="font-medium text-slate-800">{selectedProspect.experience || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Employment Type</span>
                    <span className="font-medium text-slate-800">{selectedProspect.employment || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Submitted Date</span>
                    <span className="font-medium text-slate-800">
                      {selectedProspect.submittedAt ? new Date(selectedProspect.submittedAt).toLocaleDateString('en-AU') : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Step 1 Brochure</span>
                    {selectedProspect.brochureSent ? (
                      <span className="font-medium text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Sent
                      </span>
                    ) : (
                      <span className="font-medium text-amber-600">Not Sent</span>
                    )}
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

                {/* Email & Attachment History Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <History className="h-4 w-4 text-[#095c7b]" />
                      Sent Emails & Attachment Log
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {selectedProspect.emailLogs?.length || 0} email(s) logged
                    </span>
                  </h4>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {!selectedProspect.emailLogs || selectedProspect.emailLogs.length === 0 ? (
                      <div className="p-4 bg-slate-50 border rounded-md text-center text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-slate-700">No emails sent yet</p>
                        <p>Click "Send Email / Brochure" to dispatch Step 1 Franchise Brochure or follow-up documents.</p>
                      </div>
                    ) : (
                      selectedProspect.emailLogs.map((log: ProspectEmailLog) => (
                        <div key={log.id} className="p-3 bg-slate-50 border rounded-md text-xs space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold text-slate-900 block">{log.subject}</span>
                              <span className="text-[11px] text-slate-500">
                                Sent to <strong className="text-slate-700">{log.recipient}</strong> by {log.sentByName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.sentAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {log.customMessage && (
                            <p className="text-slate-700 bg-white p-2 border rounded text-xs whitespace-pre-wrap">{log.customMessage}</p>
                          )}

                          {log.attachments && log.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[11px] font-medium text-slate-500 w-full">Attachments ({log.attachments.length}):</span>
                              {log.attachments.map((att, idx) => (
                                <Badge key={idx} variant="outline" className="bg-white border-slate-300 text-slate-700 gap-1 text-[11px] py-0.5">
                                  <Paperclip className="h-3 w-3 text-[#095c7b]" />
                                  <span>{att.name}</span>
                                  {att.size ? <span className="text-slate-400 font-mono text-[10px]">({Math.round(att.size / 1024)}KB)</span> : null}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Operations Follow-up Notes Timeline */}
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Operations Internal Notes</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{selectedProspect.notes?.length || 0} notes</span>
                  </h4>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {!selectedProspect.notes || selectedProspect.notes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No internal notes logged yet.</p>
                    ) : (
                      selectedProspect.notes.map((note) => (
                        <div key={note.id} className="p-2.5 bg-slate-50 border rounded-md text-xs space-y-1">
                          <div className="flex justify-between items-center text-slate-500 font-medium">
                            <span>{note.createdByName}</span>
                            <span>{new Date(note.createdAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-800 leading-normal">{note.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Log an internal call or follow-up note..."
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

      {/* Add Prospect Modal Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#095c7b]">Add Franchise Prospect</DialogTitle>
            <DialogDescription>
              Enter candidate details to log a franchisee prospect. Previews of Greg Hart's brochure email and IM schedule update live as you fill out the form.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProspect} className="pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                    <Input
                      required
                      placeholder="e.g. John"
                      value={addForm.firstName}
                      onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></label>
                    <Input
                      required
                      placeholder="e.g. Smith"
                      value={addForm.lastName}
                      onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                    <Input
                      type="email"
                      placeholder="john.smith@example.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                    <Input
                      type="tel"
                      placeholder="0412 345 678"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Which franchise territory are they enquiring about?</label>
                  <Select
                    value={addForm.preferredTerritory}
                    onValueChange={(val) => setAddForm({ ...addForm, preferredTerritory: val })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select presale territory..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No specific location yet</SelectItem>
                      {presaleTerritories.map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name} {t.state ? `(${t.state})` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other / Unlisted Location...</SelectItem>
                    </SelectContent>
                  </Select>

                  {addForm.preferredTerritory === 'OTHER' && (
                    <Input
                      placeholder="Enter specific territory name (e.g. Parramatta, NSW)"
                      value={addForm.customTerritory}
                      onChange={(e) => setAddForm({ ...addForm, customTerritory: e.target.value })}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">What best describes you?</label>
                  <Select value={addForm.interest} onValueChange={(val) => setAddForm({ ...addForm, interest: val })}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Please select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I'm an investor">I'm an investor</SelectItem>
                      <SelectItem value="I'd like to become an owner-operator">I'd like to become an owner-operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Do you have a vehicle?</label>
                    <Select value={addForm.vehicle} onValueChange={(val) => setAddForm({ ...addForm, vehicle: val })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Please select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Years of experience?</label>
                    <Select value={addForm.experience} onValueChange={(val) => setAddForm({ ...addForm, experience: val })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Please select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0–1 years">0–1 years</SelectItem>
                        <SelectItem value="1–3 years">1–3 years</SelectItem>
                        <SelectItem value="3–5 years">3–5 years</SelectItem>
                        <SelectItem value="5+ years">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Additional Message / Background Notes</label>
                  <Input
                    placeholder="Optional notes or details about the applicant..."
                    value={addForm.message}
                    onChange={(e) => setAddForm({ ...addForm, message: e.target.value })}
                  />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#095c7b] block">Send Franchise Brochure (Step 1)</span>
                    <span className="text-[11px] text-slate-600">Automatically emails the official Franchise Brochure PDF to applicant upon creation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={addForm.sendBrochureImmediately}
                    onChange={(e) => setAddForm({ ...addForm, sendBrochureImmediately: e.target.checked })}
                    className="h-4 w-4 text-[#095c7b] rounded border-slate-300"
                  />
                </div>
              </div>

              {/* Right Column: Live Email Preview */}
              <div className="lg:col-span-6 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-[#095c7b]" /> Live Outbound Email Preview
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20">
                    Step 1 Brochure Email
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 border-b pb-1.5 text-slate-600">
                      <span className="font-semibold text-slate-900 w-12">From:</span>
                      <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        greg.hart@mailplus.com.au
                      </span>
                      <span className="text-[10px] text-slate-500">(Greg Hart - Head of Franchise Sales)</span>
                    </div>
                    <div className="flex items-center gap-2 border-b pb-1.5 text-slate-600">
                      <span className="font-semibold text-slate-900 w-12">CC:</span>
                      <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        michael.mcdaid@mailplus.com.au
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-b pb-1.5 text-slate-600">
                      <span className="font-semibold text-slate-900 w-12">To:</span>
                      <span className="font-mono text-slate-800">
                        {addForm.email ? addForm.email : <span className="text-slate-400 italic">applicant@example.com</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-b pb-1.5 text-slate-600">
                      <span className="font-semibold text-slate-900 w-12">Subject:</span>
                      <span className="font-medium text-slate-800">
                        MailPlus Franchise Opportunity - Information Brochure
                        {addForm.preferredTerritory && addForm.preferredTerritory !== 'NONE'
                          ? ` in ${addForm.preferredTerritory === 'OTHER' ? addForm.customTerritory || 'Unlisted Location' : addForm.preferredTerritory}`
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="font-semibold text-slate-900 w-12">Attach:</span>
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-[#095c7b] border border-blue-200 rounded px-2 py-0.5 font-medium text-[11px]">
                        <Paperclip className="h-3 w-3" /> MailPlus Franchise Information Brochure.pdf
                      </span>
                    </div>
                  </div>

                  {/* Styled Email Body Box */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-xs">
                    <div className="bg-[#095c7b] py-3 text-center">
                      <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" className="h-7 inline-block" />
                    </div>
                    <div className="p-4 space-y-3 text-slate-700 leading-relaxed">
                      <p className="font-bold text-[#095c7b] text-sm">
                        Hi {addForm.firstName ? addForm.firstName : 'Applicant'},
                      </p>
                      <p>
                        Thank you for your enquiry regarding MailPlus franchise opportunities
                        {addForm.preferredTerritory && addForm.preferredTerritory !== 'NONE'
                          ? ` in ${addForm.preferredTerritory === 'OTHER' ? addForm.customTerritory || 'your territory' : addForm.preferredTerritory}`
                          : ''}.
                      </p>
                      <p>
                        As Step 1 of our franchise review process, please find attached our official <strong>MailPlus Franchise Information Brochure</strong> detailing our mobile B2B express logistics model, recurring revenue streams, and head office sales support.
                      </p>
                      <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1.5 my-2">
                        <div className="flex items-start gap-2">
                          <span>🚚</span>
                          <div><strong>Proven Mobile B2B Model:</strong> Recurring B2B customer pickup & delivery revenue.</div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span>📍</span>
                          <div><strong>Exclusive Territory:</strong> Dedicated customer base with full head office operational backing.</div>
                        </div>
                      </div>
                      <p>
                        Our team will be in contact shortly to discuss your application. If you have immediate questions, feel free to call us on <strong>1300 65 65 95</strong>.
                      </p>
                      <div className="pt-2 border-t text-slate-600">
                        <p>Kind regards,</p>
                        <p className="font-bold text-[#095c7b]">Greg Hart</p>
                        <p className="text-[11px] text-slate-500">Head of Franchise Sales | MailPlus</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border-t p-2.5 text-center text-[10px] text-slate-400">
                      MailPlus Australia &copy; 2026 | Business logistics, made simple.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingNewProspect} className="bg-[#095c7b] hover:bg-[#074760] text-white">
                {submittingNewProspect ? <Loader className="mr-2 h-4 w-4" /> : null}
                Save Prospect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Email & Attachments Modal */}
      <Dialog open={isSendEmailModalOpen} onOpenChange={setIsSendEmailModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#095c7b]">Send Email & Attachments</DialogTitle>
            <DialogDescription>
              Dispatch email to {emailTargetProspect?.fullName} ({emailTargetProspect?.email}) and log to history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email Subject Line..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Custom Message Body</label>
              <textarea
                rows={5}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type your email message to the prospect..."
                className="w-full p-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
              />
            </div>

            {/* Step 1 Brochure Attachment Toggle */}
            <div className="p-3 bg-slate-50 border rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#095c7b]" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Attach Franchise Brochure PDF (Step 1)</span>
                  <span className="text-[11px] text-slate-500">Official brochure from Zee sales process folder</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeBrochure}
                onChange={(e) => setIncludeBrochure(e.target.checked)}
                className="h-4 w-4 text-[#095c7b] rounded border-slate-300"
              />
            </div>

            {/* Custom Attachments Section */}
            <div className="space-y-2 pt-1 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-[#095c7b]" />
                  Additional Custom Attachments
                </label>
                <label className="cursor-pointer text-xs font-semibold text-[#095c7b] hover:underline flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Attach File
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {additionalFiles.length > 0 ? (
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border">
                  {additionalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Paperclip className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{file.name}</span>
                        {file.size ? <span className="text-slate-400 text-[10px]">({Math.round(file.size / 1024)}KB)</span> : null}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveFile(idx)}
                        className="h-6 w-6 text-slate-400 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No extra custom files attached yet.</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSendEmailModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={sendingEmail} className="bg-[#095c7b] hover:bg-[#074760] text-white gap-1.5">
                {sendingEmail ? <Loader className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                Send Email & Log History
              </Button>
            </DialogFooter>
          </div>
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
