'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ChevronDown, Bell } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Lead } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { VisualIframeEditor } from '@/components/ui/visual-iframe-editor';
import { encryptLeadId } from '@/lib/localmile-security';
import { OpenTrackingTips } from '@/components/ui/open-tracking-tips';

interface LeadEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export function LeadEmailDialog({ isOpen, onClose, lead }: LeadEmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notifyOnOpen, setNotifyOnOpen] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const snap = await getDocs(collection(firestore, 'marketing_templates'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
        setTemplates(list);
      } catch (error) {
        console.error('Error fetching templates', error);
      }
    }
    if (isOpen) {
      fetchTemplates();
      setSubject('');
      setMessage('');
      setSelectedTemplate('custom');
    }
  }, [isOpen]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'custom') {
      setSubject('');
      setMessage('');
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template && lead) {
      const primaryContact = lead.contacts?.find(c => c.isPrimary) || (lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null);
      const contactName = primaryContact?.name || 'Customer';
      const encryptedId = lead.id ? encryptLeadId(lead.id) : '';
      const sofPublicLink = lead.sofLink || (lead as any).standingOrderFormLink || (lead.id ? `https://prospectplus.com.au/sof/${encryptedId}` : '');
      
      let parsedSubject = template.subject || '';
      parsedSubject = parsedSubject.replace(/\{\{Contact\.Name\}\}/gi, contactName);
      parsedSubject = parsedSubject.replace(/\{\{Company\.Name\}\}/gi, lead.companyName || '');
      parsedSubject = parsedSubject.replace(/\{\{SalesRep\.Name\}\}/gi, userProfile?.displayName || userProfile?.firstName || 'Account Manager');
      parsedSubject = parsedSubject.replace(/\{\{Lead\.StandingOrderFormLink\}\}/gi, sofPublicLink);
      parsedSubject = parsedSubject.replace(/\{\{Lead\.SOFLink\}\}/gi, sofPublicLink);
      parsedSubject = parsedSubject.replace(/\{\{Lead\.StandingOrderLink\}\}/gi, sofPublicLink);
      parsedSubject = parsedSubject.replace(/\{\{StandingOrderFormLink\}\}/gi, sofPublicLink);
      parsedSubject = parsedSubject.replace(/\{\{SOFLink\}\}/gi, sofPublicLink);
      parsedSubject = parsedSubject.replace(/\{\{StandingOrderLink\}\}/gi, sofPublicLink);
      setSubject(parsedSubject);
      
      let parsedBody = template.body;
      parsedBody = parsedBody.replace(/\{\{Contact\.Name\}\}/gi, contactName);
      parsedBody = parsedBody.replace(/\{\{Company\.Name\}\}/gi, lead.companyName || '');
      parsedBody = parsedBody.replace(/\{\{SalesRep\.Name\}\}/gi, userProfile?.displayName || userProfile?.firstName || 'Account Manager');
      parsedBody = parsedBody.replace(/\{\{Lead\.StandingOrderFormLink\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{Lead\.SOFLink\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{Lead\.StandingOrderLink\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{StandingOrderFormLink\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{SOFLink\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{StandingOrderLink\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{sof_link\}\}/gi, sofPublicLink);
      parsedBody = parsedBody.replace(/\{\{SOF_Link\}\}/gi, sofPublicLink);
      
      setMessage(parsedBody);
    }
  };

  const insertPlaceholder = (ph: string) => {
    setMessage(prev => prev + ' ' + ph);
  };

  const insertSubjectPlaceholder = (ph: string) => {
    setSubject(prev => prev + ph);
  };

  const handleSend = async () => {
    if (!lead) return;
    
    const hasPrimary = lead.contacts?.some(c => c.isPrimary);
    if (!hasPrimary) {
      toast({ variant: 'destructive', title: 'Primary Contact Required', description: 'You must set a Primary Contact in the Contacts tab before sending emails.' });
      return;
    }

    const primaryContact = lead.contacts?.find(c => c.isPrimary);
    const toEmail = primaryContact?.email || lead.customerServiceEmail || (lead.contacts && lead.contacts.length > 0 ? lead.contacts[0].email : null);
    
    if (!toEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'No email address found for this lead.' });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject and message cannot be empty.' });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/campaigns/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject,
          html: selectedTemplate !== 'custom' ? message : message.replace(/\n/g, '<br/>'),
          customFrom: userProfile?.email || user?.email,
          isTemplate: selectedTemplate !== 'custom',
          leadId: lead.id,
          notifyOnOpen,
          notifyUserId: userProfile?.uid || user?.uid,
          notifyUserEmail: userProfile?.email || user?.email,
          trackingCategory: 'custom'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: 'Email Sent', description: 'Your message has been dispatched successfully.' });
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Email Failed', description: result.message || 'Failed to send email.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred while sending the email.' });
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;
  const hasPrimary = lead.contacts?.some(c => c.isPrimary);
  const primaryContact = lead.contacts?.find(c => c.isPrimary);
  const toEmail = primaryContact?.email || lead.customerServiceEmail || (lead.contacts && lead.contacts.length > 0 ? lead.contacts[0].email : 'No email available');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col bg-card border">
        <DialogHeader>
          <DialogTitle>Send Email to {lead.companyName}</DialogTitle>
          <DialogDescription>
            Compose an email to {toEmail}. Sending as {userProfile?.email}.
          </DialogDescription>
        </DialogHeader>
        {!hasPrimary && (
          <div className="bg-destructive/15 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm font-semibold my-2">
            Warning: No Primary Contact is defined for this lead. A Primary Contact is mandatory to send emails. Please set a Primary Contact in the Contacts section.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplate} onValueChange={applyTemplate}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Email</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="subject">Subject</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2 py-1 gap-1">
                      Placeholders <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Contact.Name}}')}>Contact Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Company.Name}}')}>Company Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{SalesRep.Name}}')}>Sales Rep Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Lead.StandingOrderFormLink}}')}>Standing Order Form Link</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Input
                id="subject"
                placeholder="Email Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
              />
            </div>

            {/* Open Tracking Notification Checkbox */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-md p-3">
                <Checkbox 
                  id="notifyOnOpenLeadEmail" 
                  checked={notifyOnOpen} 
                  onCheckedChange={(checked) => setNotifyOnOpen(!!checked)}
                />
                <div className="grid gap-1 leading-none">
                  <label
                    htmlFor="notifyOnOpenLeadEmail"
                    className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5 cursor-pointer text-slate-800"
                  >
                    <Bell className="h-3.5 w-3.5 text-[#095c7b]" />
                    Notify me (In-App & Email Alert) when recipient opens this email
                  </label>
                  <p className="text-[11px] text-slate-500">
                    You will receive a notification and inbox alert when this message is opened.
                  </p>
                </div>
              </div>
              {notifyOnOpen && <OpenTrackingTips className="mt-1" />}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs" 
                  onClick={() => insertPlaceholder('{{Lead.StandingOrderFormLink}}')}
                >
                  + Standing Order Link
                </Button>
              </div>
              <Textarea
                id="message"
                placeholder="Enter your email text..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[250px] bg-slate-50 focus-visible:bg-white transition-colors p-3"
              />
            </div>
          </div>
          <div className="flex flex-col space-y-2 h-full min-h-[300px]">
            <Label>Email Preview</Label>
            <div className="border rounded-md bg-white flex flex-col flex-1 relative overflow-hidden min-h-[350px] h-full">
              {message ? (
                <VisualIframeEditor 
                  body={message}
                  setBody={setMessage}
                  primaryColor="#095c7b"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  readOnly={true}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <span className="text-xs text-muted-foreground">Type a message to see the preview</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim() || !subject.trim() || toEmail === 'No email available' || !hasPrimary} className="gap-2">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
