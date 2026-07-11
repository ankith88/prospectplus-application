'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Mail, Send } from 'lucide-react';

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
];

export function DailyReportRecipients() {
  const [activeTab, setActiveTab] = useState('barcodes');
  const [recipientsMap, setRecipientsMap] = useState<Record<string, string[]>>({});
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllConfigs = async () => {
      setLoading(true);
      const data: Record<string, string[]> = {};
      try {
        for (const report of REPORTS) {
          const docRef = doc(firestore, 'settings', report.docId);
          const snap = await getDoc(docRef);
          if (snap.exists() && Array.isArray(snap.data()?.recipients)) {
            data[report.id] = snap.data()?.recipients;
          } else {
            data[report.id] = [...report.defaultRecipients];
          }
        }
        setRecipientsMap(data);
      } catch (error) {
        console.error('Error fetching recipients:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load report recipient lists.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllConfigs();
  }, [toast]);

  const activeReport = REPORTS.find(r => r.id === activeTab)!;
  const activeRecipients = recipientsMap[activeTab] || [];

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

  const handleSendTestEmail = async () => {
    setTesting(true);
    try {
      const response = await fetch(activeReport.testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients: activeRecipients }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Test Email Sent',
          description: result.message || `A sample ${activeReport.title} was sent successfully.`,
        });
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: error.message || 'An error occurred while sending the test email.',
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
        <TabsList className="grid grid-cols-3 max-w-2xl bg-slate-100 p-1">
          <TabsTrigger value="barcodes" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Barcodes Sync
          </TabsTrigger>
          <TabsTrigger value="leads" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Website Leads
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Tickets by Source
          </TabsTrigger>
        </TabsList>

        {REPORTS.map((report) => (
          <TabsContent key={report.id} value={report.id} className="mt-4 focus-visible:outline-none space-y-4">
            <div className="flex flex-col gap-2 pt-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#095c7b]" />
                {report.title} Recipients
              </h3>
              <p className="text-sm text-muted-foreground">
                {report.description}
              </p>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 max-w-md">
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

            <div className="border rounded-lg max-w-md overflow-hidden bg-slate-50/50">
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

            <div className="pt-4 border-t flex flex-col gap-2">
              <h4 className="text-sm font-semibold">Test & Verification</h4>
              <p className="text-xs text-muted-foreground">
                Trigger a manual test email of yesterday's report immediately to the recipients configured above.
              </p>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={testing || activeRecipients.length === 0}
                  className="flex items-center gap-2"
                >
                  {testing ? <Loader /> : <Send className="h-4 w-4 text-[#095c7b]" />}
                  Send Test Email Now
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
