"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { deactivateLocalMileAccessForLead } from '@/services/localmile-deactivation';
import { Lead, CSRequest, ServiceSelection } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/services/firebase';
import { 
  ListTodo, 
  Wrench, 
  UserMinus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Trash2,
  DollarSign,
  Calendar,
  Filter,
  Plus,
  Paperclip
} from 'lucide-react';

const REASONS = ['Price too high', 'Competitor offer', 'Service Quality issues', 'No longer needed', 'Business closed', 'Other'];

export default function CSRequestsDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CSRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering
  const [activeTab, setActiveTab] = useState<'all' | 'change_of_service' | 'cancellation'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Request & Processing Modal
  const [selectedRequest, setSelectedRequest] = useState<CSRequest | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Processing States for Service Change
  const [editServices, setEditServices] = useState<ServiceSelection[]>([]);
  const [serviceChangeNotes, setServiceChangeNotes] = useState('');

  // Processing States for Cancellation
  const [cancelSaveStrategy, setCancelSaveStrategy] = useState<'Keep Existing' | 'Change Frequency & Price' | 'Keep Frequency Update Price' | 'Remove Service'>('Keep Existing');
  const [cancelReason, setCancelReason] = useState('Other');
  const [trueCancellationDate, setTrueCancellationDate] = useState('');
  const [processMode, setProcessMode] = useState<'save' | 'cancel'>('save');
  const [cancelNotes, setCancelNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 1. Fetch from cs_requests
      const csSnap = await getDocs(collection(firestore, 'cs_requests'));
      const csList = csSnap.docs.map(d => ({ id: d.id, ...d.data() } as CSRequest));

      // 2. Fetch legacy items from cancellations to ensure complete coverage
      const cancelSnap = await getDocs(collection(firestore, 'cancellations'));
      const legacyList = cancelSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          requestType: 'cancellation' as const,
          leadId: data.leadId,
          netsuiteId: data.netsuiteId || '',
          companyName: data.companyName || 'Unknown Company',
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          requestedDate: data.requestedDate || new Date().toISOString(),
          cancellationDate: data.cancellationDate,
          cancellationReason: data.cancellationReason,
          cancellationTheme: data.cancellationTheme,
          cancellationWhy: data.cancellationWhy,
          status: data.status || 'Pending',
          notes: data.cancellationNotes || data.notes || '',
          originalServices: data.originalServices || [],
          processedBy: data.processedBy,
          createdAt: data.createdAt,
        } as CSRequest;
      });

      // Merge and deduplicate by ID or leadId + requestedDate
      const existingIds = new Set(csList.map(item => item.id));
      const merged = [...csList];

      for (const leg of legacyList) {
        if (!existingIds.has(leg.id)) {
          merged.push(leg);
        }
      }

      // Sort: Pending first, then by requestedDate desc
      merged.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.requestedDate || 0).getTime() - new Date(a.requestedDate || 0).getTime();
      });

      setRequests(merged);
    } catch (e) {
      console.error('[CS Requests Dashboard] Error fetching requests:', e);
      toast({
        title: 'Error loading requests',
        description: 'Failed to retrieve CS requests.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered requests computed property
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Tab filter
      if (activeTab === 'change_of_service' && req.requestType !== 'change_of_service') return false;
      if (activeTab === 'cancellation' && req.requestType !== 'cancellation') return false;

      // 2. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'Pending' && req.status !== 'Pending') return false;
        if (statusFilter === 'Completed' && req.status !== 'Completed' && req.status !== 'Saved') return false;
        if (statusFilter === 'Cancelled' && req.status !== 'Cancelled') return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (req.companyName || '').toLowerCase();
        const ns = (req.netsuiteId || '').toLowerCase();
        const contact = (req.contactName || '').toLowerCase();
        const email = (req.contactEmail || '').toLowerCase();
        return comp.includes(q) || ns.includes(q) || contact.includes(q) || email.includes(q);
      }

      return true;
    });
  }, [requests, activeTab, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const serviceChanges = requests.filter(r => r.requestType === 'change_of_service').length;
    const cancellations = requests.filter(r => r.requestType === 'cancellation').length;
    const pending = requests.filter(r => r.status === 'Pending').length;

    return { total, serviceChanges, cancellations, pending };
  }, [requests]);

  const handleOpenProcess = (req: CSRequest) => {
    setSelectedRequest(req);
    setEditServices(JSON.parse(JSON.stringify(req.requestedServices || req.originalServices || [])));
    setServiceChangeNotes(req.notes || '');

    setCancelSaveStrategy('Keep Existing');
    setCancelReason(req.cancellationReason || 'Other');
    setTrueCancellationDate(req.cancellationDate?.substring(0, 10) || new Date().toISOString().substring(0, 10));
    setCancelNotes(req.notes || '');
    setProcessMode('save');

    setProcessModalOpen(true);
  };

  const handleCopyPublicLink = (companyId: string, companyName: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prospectplus.com.au';
    const publicUrl = `${origin}/customer-request/${companyId}`;
    navigator.clipboard.writeText(publicUrl);

    toast({
      title: 'Public Request Link Copied',
      description: `Link for ${companyName} copied to clipboard!`,
    });
  };

  const handleInitiateCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    window.open(`aircall:${phoneNumber}`);
  };

  // Process Change of Service (Applies new services & completes request)
  const handleProcessServiceChange = async (newStatus: 'Completed' | 'Cancelled') => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'Customer Success Rep';
      const processedAt = new Date().toISOString();

      if (newStatus === 'Completed') {
        // Update services in leads collection
        await updateDoc(doc(firestore, 'leads', selectedRequest.leadId), {
          services: editServices,
          serviceChangeRequested: false,
          customerStatus: 'Won'
        });

        // Update cs_requests document
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Completed',
          updatedServices: editServices,
          notes: serviceChangeNotes ? `${selectedRequest.notes || ''}\n[Resolution]: ${serviceChangeNotes}` : selectedRequest.notes,
          processedBy: userDisplayName,
          processedAt,
        });

        // Log activity
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Change of Service Request completed by ${userDisplayName}.\nUpdated active services count: ${editServices.length}`,
          author: userDisplayName,
        });

        toast({
          title: 'Service Change Completed',
          description: `Services updated for ${selectedRequest.companyName}.`,
        });
      } else {
        // Dismiss / Cancel request
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Cancelled',
          notes: serviceChangeNotes ? `${selectedRequest.notes || ''}\n[Dismissed]: ${serviceChangeNotes}` : selectedRequest.notes,
          processedBy: userDisplayName,
          processedAt,
        });

        await updateDoc(doc(firestore, 'leads', selectedRequest.leadId), {
          serviceChangeRequested: false,
        });

        toast({
          title: 'Request Dismissed',
          description: `Service change request marked as cancelled.`,
        });
      }

      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error('[CS Requests Dashboard] Error processing service change:', e);
      toast({
        title: 'Error',
        description: 'Failed to update request.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Process Cancellation (Save or True Cancel)
  const handleProcessCancellation = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'Customer Success Rep';
      const processedAt = new Date().toISOString();

      if (processMode === 'save') {
        // Mark as Saved
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Saved',
          saveStrategy: cancelSaveStrategy,
          updatedServices: editServices,
          notes: cancelNotes,
          processedBy: userDisplayName,
          processedAt
        });

        // Update cancellations collection if exists
        try {
          await updateDoc(doc(firestore, 'cancellations', selectedRequest.id), {
            status: 'Saved',
            saveStrategy: cancelSaveStrategy,
            updatedServices: editServices,
            notes: cancelNotes,
            processedBy: userDisplayName,
            processedAt
          });
        } catch (e) { /* ignore if not found */ }

        // Update lead services & status
        await updateDoc(doc(firestore, 'leads', selectedRequest.leadId), {
          services: editServices,
          cancellationRequested: false,
          customerStatus: 'Won'
        });

        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation. Strategy: ${cancelSaveStrategy}. Notes: ${cancelNotes}`,
          author: userDisplayName,
        });

        toast({
          title: 'Customer Saved',
          description: `${selectedRequest.companyName} marked as Saved!`,
        });
      } else {
        // True Service Cancellation
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Cancelled',
          trueServiceCancellationDate: trueCancellationDate,
          cancellationReason: cancelReason,
          notes: cancelNotes,
          processedBy: userDisplayName,
          processedAt
        });

        try {
          await updateDoc(doc(firestore, 'cancellations', selectedRequest.id), {
            status: 'Cancelled',
            trueServiceCancellationDate: trueCancellationDate,
            cancellationReason: cancelReason,
            notes: cancelNotes,
            processedBy: userDisplayName,
            processedAt
          });
        } catch (e) { /* ignore if not found */ }

        // Update lead doc
        await updateDoc(doc(firestore, 'leads', selectedRequest.leadId), {
          customerStatus: 'Lost',
          cancellationRequested: false,
          cancellationdate: trueCancellationDate,
          cancellationReason: cancelReason
        });

        // Deactivate LocalMile access if applicable
        await deactivateLocalMileAccessForLead(selectedRequest.leadId);

        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `True Service Cancellation processed. Stop Date: ${trueCancellationDate}. Reason: ${cancelReason}`,
          author: userDisplayName,
        });

        toast({
          title: 'Cancellation Finalized',
          description: `Service cancellation recorded for ${selectedRequest.companyName}.`,
        });
      }

      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error('[CS Requests Dashboard] Error processing cancellation:', e);
      toast({
        title: 'Error',
        description: 'Failed to process cancellation request.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-[#095c7b]" />
            Customer Success Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage incoming Service Change and Cancellation requests from clients and portals.
          </p>
        </div>

        <Button
          onClick={fetchRequests}
          variant="outline"
          size="sm"
          className="self-start md:self-auto gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Requests
        </Button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Total Requests</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <ListTodo className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-100 bg-sky-50/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-sky-700">Change of Service</p>
              <h3 className="text-2xl font-bold text-[#095c7b] mt-1">{stats.serviceChanges}</h3>
            </div>
            <div className="p-3 bg-[#095c7b] text-white rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-700">Cancellations</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{stats.cancellations}</h3>
            </div>
            <div className="p-3 bg-rose-600 text-white rounded-xl">
              <UserMinus className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-800">Pending Action</p>
              <h3 className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</h3>
            </div>
            <div className="p-3 bg-amber-500 text-white rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Tabs */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Navigation Sub-Tabs */}
            <Tabs 
              value={activeTab} 
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="all" className="text-xs font-semibold">
                  All Requests ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="change_of_service" className="text-xs font-semibold">
                  <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  Service Changes ({stats.serviceChanges})
                </TabsTrigger>
                <TabsTrigger value="cancellation" className="text-xs font-semibold">
                  <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                  Cancellations ({stats.cancellations})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search company, ID, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed / Saved</SelectItem>
                  <SelectItem value="Cancelled">Cancelled / Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardHeader>

        {/* Requests Table */}
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ListTodo className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700 text-base">No CS Requests Found</h3>
              <p className="text-xs text-slate-500">No matching requests for the selected filter view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Requested Date</TableHead>
                    <TableHead className="text-xs font-bold">Company Name</TableHead>
                    <TableHead className="text-xs font-bold">Request Type</TableHead>
                    <TableHead className="text-xs font-bold">Details / Reason</TableHead>
                    <TableHead className="text-xs font-bold">Contact Person</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => {
                    const isServiceChange = req.requestType === 'change_of_service';
                    const formattedDate = req.requestedDate 
                      ? new Date(req.requestedDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A';

                    return (
                      <TableRow key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Date */}
                        <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formattedDate}
                        </TableCell>

                        {/* Company Name & IDs */}
                        <TableCell>
                          <div className="flex flex-col">
                            <Link 
                              href={`/leads/${req.leadId}`}
                              className="font-bold text-slate-900 text-xs hover:text-[#095c7b] hover:underline flex items-center gap-1"
                            >
                              {req.companyName}
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </Link>
                            <span className="text-[11px] text-slate-500 font-medium">Prospect+ ID: #{req.prospectPlusId || req.leadId}</span>
                            {req.netsuiteId && (
                              <span className="text-[11px] text-slate-400">NetSuite ID: #{req.netsuiteId}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Request Type Badge */}
                        <TableCell>
                          {isServiceChange ? (
                            <Badge className="bg-sky-100 text-[#095c7b] border-sky-200 hover:bg-sky-200 text-[11px] font-semibold gap-1">
                              <Wrench className="w-3 h-3" /> Change of Service
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 text-[11px] font-semibold gap-1">
                              <UserMinus className="w-3 h-3" /> Cancellation
                            </Badge>
                          )}
                        </TableCell>

                        {/* Details / Summary */}
                        <TableCell className="max-w-[220px]">
                          <div className="text-xs text-slate-700 truncate">
                            {isServiceChange ? (
                              req.serviceChangeCategories && req.serviceChangeCategories.length > 0 
                                ? req.serviceChangeCategories.map(c => c.replace('_', ' ')).join(', ')
                                : req.notes || 'Service updates requested'
                            ) : (
                              req.cancellationReason || req.cancellationTheme || 'Cancellation requested'
                            )}
                          </div>
                          {req.effectiveDate && (
                            <div className="text-[10px] text-slate-400">Eff: {req.effectiveDate}</div>
                          )}
                          {req.cancellationDate && !isServiceChange && (
                            <div className="text-[10px] text-rose-500 font-medium">Stop: {req.cancellationDate}</div>
                          )}
                        </TableCell>

                        {/* Contact Person */}
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-800">{req.contactName || 'Primary Contact'}</span>
                            <span className="text-slate-400 text-[11px]">{req.contactEmail || req.contactPhone || 'N/A'}</span>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          <Badge 
                            variant={
                              req.status === 'Pending' ? 'outline' : 
                              req.status === 'Completed' || req.status === 'Saved' ? 'default' : 'secondary'
                            }
                            className={`text-[11px] ${
                              req.status === 'Pending' ? 'border-amber-400 text-amber-800 bg-amber-50' :
                              req.status === 'Completed' || req.status === 'Saved' ? 'bg-emerald-600 text-white' :
                              'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            
                            {/* Copy Public Link */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Copy Public Request URL"
                              onClick={() => handleCopyPublicLink(req.leadId, req.companyName)}
                              className="h-8 px-2 text-slate-500 hover:text-[#095c7b] hover:bg-sky-50"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>

                            {/* Call Contact */}
                            {req.contactPhone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Call Contact via AirCall"
                                onClick={() => handleInitiateCall(req.contactPhone!)}
                                className="h-8 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Process Request Button */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenProcess(req)}
                              className={`h-8 px-3 text-xs font-bold text-white ${
                                req.status === 'Pending' 
                                  ? 'bg-[#095c7b] hover:bg-[#07475f]' 
                                  : 'bg-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              Process
                            </Button>

                          </div>
                        </TableCell>

                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- PROCESS REQUEST MODAL ---------------- */}
      {selectedRequest && (
        <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#095c7b] flex items-center gap-2">
                {selectedRequest.requestType === 'change_of_service' ? (
                  <>
                    <Wrench className="w-5 h-5 text-sky-500" />
                    Process Service Change: {selectedRequest.companyName}
                  </>
                ) : (
                  <>
                    <UserMinus className="w-5 h-5 text-rose-500" />
                    Process Cancellation: {selectedRequest.companyName}
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Review request details, update active services, and mark status.
              </DialogDescription>
            </DialogHeader>

            {/* Modal Body */}
            <div className="space-y-6 py-2">

              {/* Request Overview Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold text-slate-500">Prospect+ ID:</span>{' '}
                    <span className="font-bold text-slate-800">#{selectedRequest.prospectPlusId || selectedRequest.leadId}</span>
                  </div>
                  {selectedRequest.netsuiteId && (
                    <div>
                      <span className="font-semibold text-slate-500">NetSuite ID:</span>{' '}
                      <span className="font-bold text-slate-800">#{selectedRequest.netsuiteId}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-500">Contact Person:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.contactName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Email:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.contactEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Phone:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.contactPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Requested Date:</span>{' '}
                    <span className="font-bold text-slate-800">
                      {selectedRequest.requestedDate ? new Date(selectedRequest.requestedDate).toLocaleDateString('en-AU') : 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-500 block mb-0.5">Customer Notes:</span>
                    <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 italic">
                      "{selectedRequest.notes}"
                    </p>
                  </div>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-500 block mb-1">Uploaded Attachments ({selectedRequest.attachments.length}):</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#095c7b] hover:bg-sky-50 font-semibold text-xs transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">{att.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------- CHANGE OF SERVICE MODAL BODY ---------------- */}
              {selectedRequest.requestType === 'change_of_service' && (
                <div className="space-y-4">
                  
                  <Label className="text-sm font-bold text-slate-900 block">
                    Update Company Active Services
                  </Label>

                  <div className="space-y-3">
                    {editServices.map((srv, idx) => (
                      <div key={srv.id || idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800">{srv.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditServices(editServices.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:bg-rose-50 h-7 px-2 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[11px] text-slate-500 mb-1 block">Frequency</Label>
                            <Select
                              value={typeof srv.frequency === 'string' ? srv.frequency : '5 Days / Week'}
                              onValueChange={(val) => {
                                const updated = [...editServices];
                                updated[idx].frequency = val;
                                setEditServices(updated);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5 Days / Week">5 Days / Week</SelectItem>
                                <SelectItem value="3 Days / Week">3 Days / Week</SelectItem>
                                <SelectItem value="2 Days / Week">2 Days / Week</SelectItem>
                                <SelectItem value="1 Day / Week">1 Day / Week</SelectItem>
                                <SelectItem value="Adhoc">Adhoc</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-[11px] text-slate-500 mb-1 block">Rate ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={srv.rate || 0}
                              onChange={(e) => {
                                const updated = [...editServices];
                                updated[idx].rate = parseFloat(e.target.value) || 0;
                                setEditServices(updated);
                              }}
                              className="h-8 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1 block">Resolution Notes</Label>
                    <Textarea
                      placeholder="Add resolution details or actions taken..."
                      value={serviceChangeNotes}
                      onChange={(e) => setServiceChangeNotes(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                </div>
              )}

              {/* ---------------- CANCELLATION MODAL BODY ---------------- */}
              {selectedRequest.requestType === 'cancellation' && (
                <div className="space-y-4">
                  
                  {/* Action Mode Toggle */}
                  <div className="flex rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setProcessMode('save')}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        processMode === 'save'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Save Customer (Retention)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessMode('cancel')}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        processMode === 'cancel'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Finalize Cancellation
                    </button>
                  </div>

                  {processMode === 'save' ? (
                    <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">Retention Strategy</Label>
                        <Select 
                          value={cancelSaveStrategy} 
                          onValueChange={(val: any) => setCancelSaveStrategy(val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Keep Existing">Keep Existing Services & Pricing</SelectItem>
                            <SelectItem value="Change Frequency & Price">Change Frequency & Update Price</SelectItem>
                            <SelectItem value="Keep Frequency Update Price">Keep Frequency & Update Price</SelectItem>
                            <SelectItem value="Remove Service">Remove Specific Service Item</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">Retention Notes</Label>
                        <Textarea
                          placeholder="Log agreement details with client..."
                          value={cancelNotes}
                          onChange={(e) => setCancelNotes(e.target.value)}
                          rows={2}
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 rounded-xl bg-rose-50/50 border border-rose-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-slate-700 mb-1 block">True Stop Date</Label>
                          <Input
                            type="date"
                            value={trueCancellationDate}
                            onChange={(e) => setTrueCancellationDate(e.target.value)}
                            className="h-9 text-xs bg-white"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold text-slate-700 mb-1 block">Final Reason</Label>
                          <Select value={cancelReason} onValueChange={setCancelReason}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REASONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">Cancellation Notes</Label>
                        <Textarea
                          placeholder="Final exit notes..."
                          value={cancelNotes}
                          onChange={(e) => setCancelNotes(e.target.value)}
                          rows={2}
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProcessModalOpen(false)}
                disabled={submitting}
              >
                Close
              </Button>

              {selectedRequest.requestType === 'change_of_service' ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessServiceChange('Cancelled')}
                    disabled={submitting}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Dismiss Request
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleProcessServiceChange('Completed')}
                    disabled={submitting}
                    className="bg-[#095c7b] hover:bg-[#07475f] text-white font-bold"
                  >
                    {submitting ? <Loader /> : 'Apply Service Changes'}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleProcessCancellation}
                  disabled={submitting}
                  className={`font-bold text-white ${
                    processMode === 'save' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? <Loader /> : processMode === 'save' ? 'Save Customer' : 'Confirm Cancellation'}
                </Button>
              )}
            </DialogFooter>

          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
