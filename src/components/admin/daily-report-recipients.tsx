'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Mail, Send, Calendar, Clock } from 'lucide-react';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  docId: string;
  defaultRecipients: string[];
  testEndpoint: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'barcodes',
    title: 'Daily Barcodes Report',
    description: 'Consolidated report of synced package barcodes from yesterday containing Lodgement or Pickup scans.',
    docId: 'daily_barcodes_report',
    defaultRecipients: ['ankith.ravindran@mailplus.com.au'],
    testEndpoint: '/api/admin/scans/send-test-report',
  },
  {
    id: 'leads',
    title: 'Daily Website Leads Report',
    description: 'Daily report of leads created yesterday with source set to Website.',
    docId: 'daily_website_leads_report',
    defaultRecipients: ['ankith.ravindran@mailplus.com.au', 'alexandra.bathman@mailplus.com.au'],
    testEndpoint: '/api/admin/scans/send-test-leads-report',
  },
  {
    id: 'tickets',
    title: 'Daily Tickets by Source',
    description: 'Daily summary of support tickets created yesterday grouped by their creation source.',
    docId: 'daily_tickets_report',
    defaultRecipients: ['ankith.ravindran@mailplus.com.au', 'alexandra.bathman@mailplus.com.au'],
    testEndpoint: '/api/admin/scans/send-test-tickets-report',
  },
  {
    id: 'calls',
    title: 'Daily Call Report',
    description: 'Daily metrics for calls, unique leads/companies, agents, and durations from yesterday.',
    docId: 'daily_calls_report',
    defaultRecipients: ['ankith.ravindran@mailplus.com.au'],
    testEndpoint: '/api/admin/scans/send-test-calls-report',
  },
  {
    id: 'sales_snapshot',
    title: 'Daily Sales Snapshot Report',
    description: 'Daily summary of sales snapshot performance including activities, status counts, MRR movements, and team breakdowns from yesterday.',
    docId: 'daily_sales_snapshot_report',
    defaultRecipients: ['ankith.ravindran@mailplus.com.au'],
    testEndpoint: '/api/admin/scans/send-test-sales-snapshot-report',
  },
];

const FREQUENCY_OPTIONS = [
  { value: '06:00', label: 'Daily at 6:00 AM Sydney Time' },
  { value: '07:00', label: 'Daily at 7:00 AM Sydney Time' },
  { value: '08:00', label: 'Daily at 8:00 AM Sydney Time' },
  { value: '09:00', label: 'Daily at 9:00 AM Sydney Time' },
  { value: '10:00', label: 'Daily at 10:00 AM Sydney Time' },
  { value: '17:00', label: 'Daily at 5:00 PM Sydney Time' },
  { value: 'disabled', label: 'Disabled (Do not send automatically)' },
];

export function DailyReportRecipients() {
  const [activeTab, setActiveTab] = useState('barcodes');
  const [recipientsMap, setRecipientsMap] = useState<Record<string, string[]>>({});
  const [frequenciesMap, setFrequenciesMap] = useState<Record<string, string>>({});
  const [selectedDatesMap, setSelectedDatesMap] = useState<Record<string, string>>({});
  const [fromAddressMap, setFromAddressMap] = useState<Record<string, string>>({});
  const [fromAddressInput, setFromAddressInput] = useState('');
  
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get yesterday's date in local YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yyyy}-${mm}-${dd}`;

    const fetchAllConfigs = async () => {
      setLoading(true);
      const recData: Record<string, string[]> = {};
      const freqData: Record<string, string> = {};
      const dateData: Record<string, string> = {};
      const fromData: Record<string, string> = {};

      try {
        for (const report of REPORTS) {
          const docRef = doc(firestore, 'settings', report.docId);
          const snap = await getDoc(docRef);
          
          if (snap.exists()) {
            const data = snap.data();
            recData[report.id] = Array.isArray(data?.recipients) ? data.recipients : [...report.defaultRecipients];
            freqData[report.id] = data?.frequency || '06:00';
            fromData[report.id] = data?.fromAddress || 'ankith.ravindran@mailplus.com.au';
          } else {
            recData[report.id] = [...report.defaultRecipients];
            freqData[report.id] = '06:00';
            fromData[report.id] = 'ankith.ravindran@mailplus.com.au';
          }
          dateData[report.id] = yesterdayStr;
        }

        setRecipientsMap(recData);
        setFrequenciesMap(freqData);
        setSelectedDatesMap(dateData);
        setFromAddressMap(fromData);
      } catch (error) {
        console.error('Error fetching config:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load report configurations.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllConfigs();
  }, [toast]);

  useEffect(() => {
    if (fromAddressMap[activeTab]) {
      setFromAddressInput(fromAddressMap[activeTab]);
    } else {
      setFromAddressInput('ankith.ravindran@mailplus.com.au');
    }
  }, [activeTab, fromAddressMap]);

  const activeReport = REPORTS.find(r => r.id === activeTab)!;
  const activeRecipients = recipientsMap[activeTab] || [];
  const activeFrequency = frequenciesMap[activeTab] || '06:00';
  const activeSelectedDate = selectedDatesMap[activeTab] || '';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    
    if (!email) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    if (activeRecipients.includes(email)) {
      toast({
        variant: 'destructive',
        title: 'Already Added',
        description: 'This email is already in the recipients list for this report.',
      });
      return;
    }

    const updated = [...activeRecipients, email];
    setSaving(true);
    try {
      const docRef = doc(firestore, 'settings', activeReport.docId);
      await setDoc(docRef, { recipients: updated }, { merge: true });
      
      setRecipientsMap(prev => ({
        ...prev,
        [activeTab]: updated,
      }));
      setNewEmail('');
      toast({
        title: 'Success',
        description: `${email} has been added to the ${activeReport.title} list.`,
      });
    } catch (error) {
      console.error('Error saving recipient:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (emailToRemove: string) => {
    const updated = activeRecipients.filter(email => email !== emailToRemove);
    setSaving(true);
    try {
      const docRef = doc(firestore, 'settings', activeReport.docId);
      await setDoc(docRef, { recipients: updated }, { merge: true });
      
      setRecipientsMap(prev => ({
        ...prev,
        [activeTab]: updated,
      }));
      toast({
        title: 'Removed',
        description: `${emailToRemove} has been removed from the ${activeReport.title} list.`,
      });
    } catch (error) {
      console.error('Error removing recipient:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFrequencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFreq = e.target.value;
    setSaving(true);
    try {
      const docRef = doc(firestore, 'settings', activeReport.docId);
      await setDoc(docRef, { frequency: newFreq }, { merge: true });
      
      setFrequenciesMap(prev => ({
        ...prev,
        [activeTab]: newFreq,
      }));
      toast({
        title: 'Frequency Updated',
        description: `Successfully scheduled to ${FREQUENCY_OPTIONS.find(o => o.value === newFreq)?.label}`,
      });
    } catch (error) {
      console.error('Error saving frequency:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save frequency settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFromAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromAddress = fromAddressInput.trim().toLowerCase();
    
    if (!fromAddress) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromAddress) || !fromAddress.endsWith('@mailplus.com.au')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Sender Address',
        description: 'Please enter a valid email address ending with @mailplus.com.au',
      });
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(firestore, 'settings', activeReport.docId);
      await setDoc(docRef, { fromAddress }, { merge: true });
      
      setFromAddressMap(prev => ({
        ...prev,
        [activeTab]: fromAddress,
      }));
      toast({
        title: 'Sender Address Updated',
        description: `Successfully updated the sender address for ${activeReport.title}.`,
      });
    } catch (error) {
      console.error('Error saving sender address:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDatesMap(prev => ({
      ...prev,
      [activeTab]: newDate
    }));
  };

  const handleSendTestEmail = async () => {
    if (!activeSelectedDate) {
      toast({
        variant: 'destructive',
        title: 'Date Required',
        description: 'Please select a date for the one-off email.',
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(activeReport.testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recipients: activeRecipients,
          date: activeSelectedDate
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Email Dispatched',
          description: result.message || `The report for ${activeSelectedDate} was sent successfully.`,
        });
      } else {
        throw new Error(result.error || 'Failed to send report email');
      }
    } catch (error: any) {
      console.error('Error sending report email:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: error.message || 'An error occurred while sending the email.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 max-w-2xl bg-slate-100 p-1">
          <TabsTrigger value="barcodes" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Barcodes Sync
          </TabsTrigger>
          <TabsTrigger value="leads" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Website Leads
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Tickets by Source
          </TabsTrigger>
          <TabsTrigger value="calls" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Call Report
          </TabsTrigger>
        </TabsList>

        {REPORTS.map((report) => (
          <TabsContent key={report.id} value={report.id} className="mt-4 focus-visible:outline-none space-y-4">
            <div className="flex flex-col gap-2 pt-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#095c7b]" />
                {report.title} Settings
              </h3>
              <p className="text-sm text-muted-foreground">
                {report.description}
              </p>
            </div>

            {/* Email Schedule Frequency Setting */}
            <div className="p-4 border border-[#e2e8f0] rounded-xl bg-slate-50/50 max-w-md space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-slate-800">
                <Clock className="h-4 w-4 text-[#095c7b]" />
                Report Schedule Frequency
              </h4>
              <div className="flex flex-col gap-1.5">
                <select
                  value={activeFrequency}
                  onChange={handleFrequencyChange}
                  disabled={saving}
                  className="w-full bg-white border border-input rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  The automated daily scheduler checks the configuration hourly and sends email only during selected hours.
                </p>
              </div>
            </div>

            {/* Report Sender From Address Setting */}
            <div className="p-4 border border-[#e2e8f0] rounded-xl bg-slate-50/50 max-w-md space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-slate-800">
                <Mail className="h-4 w-4 text-[#095c7b]" />
                Report Sender (From Address)
              </h4>
              <form onSubmit={handleSaveFromAddress} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="e.g. ankith.ravindran@mailplus.com.au"
                  value={fromAddressInput}
                  onChange={(e) => setFromAddressInput(e.target.value)}
                  disabled={saving}
                  className="flex-1 bg-white"
                />
                <Button type="submit" disabled={saving || !fromAddressInput.trim() || fromAddressInput === fromAddressMap[activeTab]} className="bg-[#095c7b] hover:bg-[#07475d]">
                  Save
                </Button>
              </form>
              <p className="text-[11px] text-muted-foreground">
                This address will be used in the 'From' field for the daily report emails. Must end with @mailplus.com.au.
              </p>
            </div>

            {/* Recipients List configuration */}
            <div className="space-y-3 max-w-md pt-2">
              <h4 className="text-sm font-semibold text-slate-800">Recipients List</h4>
              <form onSubmit={handleAdd} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="e.g. employee@mailplus.com.au"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={saving}
                  className="flex-1"
                />
                <Button type="submit" disabled={saving || !newEmail.trim()} className="bg-[#095c7b] hover:bg-[#07475d]">
                  {saving ? <Loader /> : <Plus className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </form>

              <div className="border rounded-lg overflow-hidden bg-slate-50/50">
                {activeRecipients.length > 0 ? (
                  <ul className="divide-y bg-white">
                    {activeRecipients.map((email) => (
                      <li key={email} className="flex items-center justify-between p-3">
                        <span className="text-sm font-medium text-slate-700">{email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(email)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No recipients configured. Defaulting to: {report.defaultRecipients.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* One-off Trigger with Date Selection */}
            <div className="pt-4 border-t max-w-md flex flex-col gap-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-slate-800">
                <Calendar className="h-4 w-4 text-[#095c7b]" />
                Trigger One-off Email
              </h4>
              <p className="text-xs text-muted-foreground">
                Generate and send a report immediately to the configured recipients based on your selected date.
              </p>
              
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={activeSelectedDate}
                  onChange={handleDateChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={testing || activeRecipients.length === 0}
                  className="flex items-center gap-2 bg-white"
                >
                  {testing ? <Loader /> : <Send className="h-4 w-4 text-[#095c7b]" />}
                  Send Email Now
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
