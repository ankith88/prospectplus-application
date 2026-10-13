"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  Wrench,
  Calendar,
  AlertTriangle,
  Edit3,
  Trash2,
  Plus,
  ExternalLink,
  CheckCircle2,
  FileText,
  User,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { safeFormatDate } from '@/lib/utils';
import { ServiceSelection } from '@/lib/types';

const COMMON_SERVICES = [
  { name: 'AMPO', label: 'AMPO (Morning PO Box Collection)' },
  { name: 'PMPO', label: 'PMPO (Afternoon Mail Lodgement)' },
  { name: 'EB', label: 'EB (Express Banking)' },
  { name: 'CB', label: 'CB (Change Banking)' },
  { name: 'PARCEL_PICKUP', label: 'Parcel Pickup' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

interface ActiveCsRequest {
  id: string;
  leadId: string;
  prospectPlusId?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  requestedBy?: string;
  capturedBy?: string;
  requestedDate?: string;
  serviceChangeCategories?: string[];
  requestedServices?: ServiceSelection[];
  effectiveDate?: string;
  notes?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
  status: string;
}

interface ActiveServiceChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ActiveCsRequest;
  leadId: string;
  companyName: string;
  userDisplayName?: string;
  onRequestCancelled?: () => void;
  onRequestUpdated?: (updatedRequest: ActiveCsRequest) => void;
}

export function ActiveServiceChangeDialog({
  open,
  onOpenChange,
  request,
  leadId,
  companyName,
  userDisplayName = 'Staff User',
  onRequestCancelled,
  onRequestUpdated,
}: ActiveServiceChangeDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isCancellingConfirm, setIsCancellingConfirm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit form state
  const [editEffectiveDate, setEditEffectiveDate] = useState(request.effectiveDate || '');
  const [editNotes, setEditNotes] = useState(request.notes || '');
  const [editServices, setEditServices] = useState<ServiceSelection[]>(() => {
    return JSON.parse(JSON.stringify(request.requestedServices || []));
  });

  // Reset when request changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setIsEditing(false);
      setIsCancellingConfirm(false);
      setCancellationReason('');
      setEditEffectiveDate(request.effectiveDate || '');
      setEditNotes(request.notes || '');
      setEditServices(JSON.parse(JSON.stringify(request.requestedServices || [])));
    }
  }, [open, request]);

  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cs-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: 'cancel',
          notes: cancellationReason.trim(),
          userDisplayName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel CS request');
      }

      toast({
        title: 'Service Change Request Cancelled',
        description: `Active request #${request.id} for ${companyName} has been cancelled.`,
      });

      onOpenChange(false);
      if (onRequestCancelled) onRequestCancelled();
    } catch (err: any) {
      console.error('Error cancelling CS request:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel CS request.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cs-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: 'update',
          effectiveDate: editEffectiveDate,
          requestedServices: editServices,
          notes: editNotes,
          userDisplayName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update request');
      }

      toast({
        title: 'Service Change Request Updated',
        description: 'Updated services and effective date have been saved.',
      });

      setIsEditing(false);
      if (onRequestUpdated && data.request) {
        onRequestUpdated(data.request);
      }
    } catch (err: any) {
      console.error('Error updating CS request:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update request.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDayForService = (index: number, day: (typeof WEEK_DAYS)[number]) => {
    setEditServices(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const currentDays = Array.isArray(target.frequency)
        ? (target.frequency as (typeof WEEK_DAYS)[number][])
        : typeof target.frequency === 'string' && target.frequency !== 'Adhoc'
          ? [target.frequency as (typeof WEEK_DAYS)[number]]
          : [];

      if (currentDays.includes(day)) {
        target.frequency = currentDays.filter(d => d !== day);
      } else {
        target.frequency = [...currentDays, day];
      }
      updated[index] = target;
      return updated;
    });
  };

  const updateRate = (index: number, rateStr: string) => {
    const rateVal = parseFloat(rateStr) || 0;
    setEditServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], rate: rateVal };
      return updated;
    });
  };

  const removeServiceRow = (index: number) => {
    setEditServices(prev => prev.filter((_, i) => i !== index));
  };

  const addServiceRow = (serviceName: string) => {
    setEditServices(prev => [
      ...prev,
      {
        name: serviceName,
        frequency: ['Tue', 'Fri'],
        rate: 14.5,
      },
    ]);
  };

  const formatDays = (freq: any) => {
    if (!freq) return 'Adhoc';
    if (Array.isArray(freq)) {
      if (freq.length === 5) return 'Daily (Mon-Fri)';
      if (freq.length === 0) return 'Adhoc';
      return freq.join(', ');
    }
    return String(freq);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Active Service Change Request
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Request #{request.id} for {companyName || request.companyName}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 font-semibold px-2.5 py-1">
              Pending Review
            </Badge>
          </div>
        </DialogHeader>

        {isCancellingConfirm ? (
          <div className="py-4 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Cancel Service Change Request</h4>
                <p className="text-xs text-rose-700 mt-1">
                  Are you sure you want to cancel this pending service change request? This will mark the request as Cancelled in the CS queue, clear the active request banner, and log an audit entry in the activity timeline.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Cancellation Reason / Notes (Optional)
              </Label>
              <Textarea
                placeholder="e.g. Customer decided to stay on existing schedule, entered in error, etc."
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                className="text-sm min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancellingConfirm(false)}
                disabled={loading}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelRequest}
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {loading ? <Loader className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="py-4 space-y-5">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-center justify-between">
              <span>Editing Requested Services &amp; Effective Date</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-7 text-xs text-sky-700 hover:text-sky-900"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Discard
              </Button>
            </div>

            {/* Effective Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Requested Effective Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <Input
                  type="date"
                  value={editEffectiveDate}
                  onChange={e => setEditEffectiveDate(e.target.value)}
                  className="max-w-xs text-sm"
                />
              </div>
            </div>

            {/* Services Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Requested Services &amp; Rates</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Add:</span>
                  {COMMON_SERVICES.filter(cs => !editServices.some(s => s.name === cs.name)).map(cs => (
                    <Button
                      key={cs.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addServiceRow(cs.name)}
                      className="h-6 text-[11px] px-2 border-dashed border-sky-300 hover:border-sky-500 hover:bg-sky-50 text-sky-800"
                    >
                      <Plus className="w-3 h-3 mr-0.5" />
                      {cs.name}
                    </Button>
                  ))}
                </div>
              </div>

              {editServices.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                  No services configured. Click a service above to add one.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold w-[120px]">Service</TableHead>
                        <TableHead className="text-xs font-bold">Schedule Days</TableHead>
                        <TableHead className="text-xs font-bold w-[120px]">Rate ($+GST)</TableHead>
                        <TableHead className="text-xs font-bold w-[50px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editServices.map((svc, idx) => {
                        const currentDays = Array.isArray(svc.frequency)
                          ? svc.frequency
                          : typeof svc.frequency === 'string' && svc.frequency !== 'Adhoc'
                            ? [svc.frequency]
                            : [];

                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold text-xs text-slate-800">
                              {svc.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1">
                                {WEEK_DAYS.map(day => {
                                  const isSelected = currentDays.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => toggleDayForService(idx, day)}
                                      className={`text-[11px] px-2 py-0.5 rounded font-medium border transition-colors ${
                                        isSelected
                                          ? 'bg-[#095c7b] text-white border-[#095c7b]'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-400">$</span>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={svc.rate ?? ''}
                                  onChange={e => updateRate(idx, e.target.value)}
                                  className="h-8 text-xs font-medium w-24"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeServiceRow(idx)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Request Notes</Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Optional notes or instructions..."
                className="text-xs min-h-[70px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={loading || editServices.length === 0}
                className="bg-[#095c7b] hover:bg-[#07475f] text-white"
              >
                {loading ? <Loader className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Info Banner */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-lg text-amber-950 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                An active service change request is currently pending review. Live services on the customer profile will update once this request is reviewed and processed, or you can edit/cancel the request below.
              </div>
            </div>

            {/* Request Meta Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border rounded-lg p-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Requested Start Date:</span>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">
                  {request.effectiveDate ? safeFormatDate(request.effectiveDate, 'EEEE, d MMM yyyy') : 'Immediate / To be confirmed'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Submitted On:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {request.requestedDate ? safeFormatDate(request.requestedDate, 'PPpp') : 'Recent'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Requested By:</span>
                <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {request.requestedBy || request.contactName || 'Customer Portal'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Captured By:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {request.capturedBy || 'Customer Portal'}
                </p>
              </div>
              {(request.contactPhone || request.contactEmail) && (
                <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                  {request.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {request.contactPhone}
                    </span>
                  )}
                  {request.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {request.contactEmail}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Requested Services Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Requested Services &amp; Rates
                </h4>
                <Badge variant="outline" className="text-[10px] bg-slate-100 font-medium">
                  {request.requestedServices?.length || 0} service(s)
                </Badge>
              </div>

              {(!request.requestedServices || request.requestedServices.length === 0) ? (
                <div className="border rounded-lg p-4 text-center text-xs text-muted-foreground">
                  No specific services listed in this request.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/75">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-slate-600">Service</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Frequency</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right">Quoted Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {request.requestedServices.map((svc, idx) => (
                        <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <TableCell className="font-semibold text-xs text-slate-800">
                            {svc.name}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDays(svc.frequency)}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-[#095c7b] text-right">
                            {svc.rate !== undefined ? `$${Number(svc.rate).toFixed(2)} + GST` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Attachments
                </h4>
                <div className="space-y-1">
                  {request.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 border rounded-md text-xs font-medium text-[#095c7b] hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="truncate flex-1">{att.name || 'View Attachment'}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {request.notes && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer Notes
                </h4>
                <p className="text-xs text-slate-600 bg-slate-50 border rounded-md p-2.5 whitespace-pre-wrap">
                  {request.notes}
                </p>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancellingConfirm(true)}
                className="w-full sm:w-auto text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Cancel This Request
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/customer-request/${leadId}`, '_blank')}
                  className="text-xs font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open Public Form
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-[#095c7b] hover:bg-[#07475f] text-white font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Edit / Change Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
