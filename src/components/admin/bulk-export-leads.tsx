'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from '../ui/loader';
import { getLeadsFromFirebase, getVisitNotes } from '@/services/firebase';
import type { Lead, VisitNote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const LEAD_STATUSES = [
  'New', 'Priority Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch',
  'Trialing ShipMate', 'Reschedule', 'Qualified', 'Pre Qualified', 'Won', 'Lost',
  'Lost Customer', 'LPO Review', 'Unqualified', 'LocalMile Pending', 'Free Trial',
  'Prospect Opportunity', 'Customer Opportunity', 'Priority Field Lead', 'Email Brush Off',
  'In Qualification', 'Quote Sent'
];

const OUTCOME_TYPES = [
  'Qualified - Set Appointment',
  'Qualified - Call Back/Send Info',
  'Upsell',
  'Unqualified Opportunity',
  'Prospect - No Access/No Contact',
  'Not Interested',
  'Empty / Closed'
];

export function BulkExportLeads() {
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialerFilter, setDialerFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const allLeadsP = getLeadsFromFirebase({ summary: false });
      const visitNotesP = getVisitNotes();

      const [allLeads, visitNotes] = await Promise.all([allLeadsP, visitNotesP]);

      const filteredLeads = allLeads.filter(lead => {
        // Status Filter
        if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
        
        // Dialer Assigned Filter
        if (dialerFilter && (!lead.dialerAssigned || !lead.dialerAssigned.toLowerCase().includes(dialerFilter.toLowerCase()))) return false;
        
        // Campaign Filter
        if (campaignFilter && (!lead.campaign || !lead.campaign.toLowerCase().includes(campaignFilter.toLowerCase()))) return false;
        
        // Field Rep Assigned
        if (repFilter && (!lead.salesRepAssigned || !lead.salesRepAssigned.toLowerCase().includes(repFilter.toLowerCase()))) return false;

        // Visit Note Outcome Filter
        if (outcomeFilter !== 'all') {
           const leadVisitNote = visitNotes.find(vn => vn.id === lead.visitNoteID || vn.leadId === lead.id);
           if (!leadVisitNote || leadVisitNote.outcome?.type !== outcomeFilter) {
               return false;
           }
        }

        return true;
      });

      if (filteredLeads.length === 0) {
        toast({ title: 'No leads found', description: 'No leads matched your filter criteria.' });
        setLoading(false);
        return;
      }

      // Generate CSV
      exportLeadsToCsv(filteredLeads, `bulk_export_leads_${new Date().toISOString().split('T')[0]}.csv`, visitNotes);
      toast({ title: 'Export Successful', description: `${filteredLeads.length} leads exported to CSV.` });
    } catch (error) {
        console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not export leads. Ensure you have the right permissions.' });
    } finally {
      setLoading(false);
    }
  };

  const escapeCsvCell = (cell: any) => {
    if (cell == null) return '';
    const stringCell = String(cell);
    if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
      return `"${stringCell.replace(/"/g, '""')}"`;
    }
    return stringCell;
  };

  const exportLeadsToCsv = (leads: Lead[], filename: string, visitNotes: VisitNote[]) => {
    const headers = [
      'Lead ID', 'Company Name', 'Status', 'Campaign', 'Dialer Assigned', 
      'Sales Rep Assigned', 'Franchisee', 'Address', 'Industry', 'Lead Type', 
      'Date Entered', 'Visit Note Outcome'
    ];
    
    const rows = leads.map(lead => {
      let outcome = '';
      const leadVisitNote = visitNotes.find(vn => vn.id === lead.visitNoteID || vn.leadId === lead.id);
      if (leadVisitNote && leadVisitNote.outcome) {
          outcome = leadVisitNote.outcome.type;
      }
      
      // Formatting Address
      const addressString = lead.address ? `${lead.address.street || ''} ${lead.address.city || ''} ${lead.address.state || ''} ${lead.address.zip || ''} ${lead.address.country || ''}`.trim() : '';

      return [
        escapeCsvCell(lead.id),
        escapeCsvCell(lead.companyName),
        escapeCsvCell(lead.status),
        escapeCsvCell(lead.campaign),
        escapeCsvCell(lead.dialerAssigned),
        escapeCsvCell(lead.salesRepAssigned),
        escapeCsvCell(lead.franchisee),
        escapeCsvCell(addressString),
        escapeCsvCell(lead.industryCategory),
        escapeCsvCell(lead.leadType),
        escapeCsvCell(lead.dateLeadEntered),
        escapeCsvCell(outcome)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {LEAD_STATUSES.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dialer-filter">Dialer Assigned</Label>
          <Input 
            id="dialer-filter" 
            placeholder="E.g. John Doe" 
            value={dialerFilter} 
            onChange={e => setDialerFilter(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-filter">Campaign</Label>
          <Input 
            id="campaign-filter" 
            placeholder="E.g. Summer Promo" 
            value={campaignFilter} 
            onChange={e => setCampaignFilter(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rep-filter">Field Rep Assigned</Label>
          <Input 
            id="rep-filter" 
            placeholder="E.g. Jane Smith" 
            value={repFilter} 
            onChange={e => setRepFilter(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="outcome-filter">Visit Note Outcome</Label>
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger id="outcome-filter">
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              {OUTCOME_TYPES.map(outcome => (
                <SelectItem key={outcome} value={outcome}>{outcome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleExport} disabled={loading}>
          {loading ? <Loader /> : <><Download className="mr-2 h-4 w-4" /> Export to CSV</>}
        </Button>
      </div>
    </div>
  );
}
