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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Lead } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { VisualIframeEditor } from '@/components/ui/visual-iframe-editor';

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();

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
      
      let parsedSubject = template.subject || '';
      parsedSubject = parsedSubject.replace(/\{\{Contact\.Name\}\}/g, contactName);
      parsedSubject = parsedSubject.replace(/\{\{Company\.Name\}\}/g, lead.companyName || '');
      parsedSubject = parsedSubject.replace(/\{\{SalesRep\.Name\}\}/g, userProfile?.displayName || userProfile?.firstName || 'Account Manager');
      setSubject(parsedSubject);
      
      let parsedBody = template.body;
      parsedBody = parsedBody.replace(/\{\{Contact\.Name\}\}/g, contactName);
      parsedBody = parsedBody.replace(/\{\{Company\.Name\}\}/g, lead.companyName || '');
      parsedBody = parsedBody.replace(/\{\{SalesRep\.Name\}\}/g, userProfile?.displayName || userProfile?.firstName || 'Account Manager');
      
      setMessage(parsedBody);
    }
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
          customFrom: userProfile?.email,
          isTemplate: selectedTemplate !== 'custom'
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
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
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
