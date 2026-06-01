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
      setSubject(template.subject);
      
      const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
      const contactName = primaryContact?.name || 'Customer';
      
      let parsedBody = template.body;
      parsedBody = parsedBody.replace(/\{\{Contact\.Name\}\}/g, contactName);
      parsedBody = parsedBody.replace(/\{\{Company\.Name\}\}/g, lead.companyName || '');
      parsedBody = parsedBody.replace(/\{\{SalesRep\.Name\}\}/g, userProfile?.displayName || userProfile?.firstName || 'Account Manager');
      
      setMessage(parsedBody);
    }
  };

  const handleSend = async () => {
    if (!lead) return;
    const toEmail = lead.customerServiceEmail || (lead.contacts && lead.contacts.length > 0 ? lead.contacts[0].email : null);
    
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
          html: message.replace(/\n/g, '<br/>'),
          customFrom: userProfile?.email
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
  const toEmail = lead.customerServiceEmail || (lead.contacts && lead.contacts.length > 0 ? lead.contacts[0].email : 'No email available');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send Email to {lead.companyName}</DialogTitle>
          <DialogDescription>
            Compose an email to {toEmail}. Sending as {userProfile?.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your email text..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim() || !subject.trim() || toEmail === 'No email available'} className="gap-2">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
