'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, X } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toEmail: string;
  recipientName?: string;
  senderEmail?: string;
}

export function EmailDialog({ isOpen, onClose, toEmail, recipientName, senderEmail }: EmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `emails/attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setAttachments((prev) => [...prev, { name: file.name, url: downloadURL }]);
      toast({ title: 'Attachment Added', description: `${file.name} attached successfully.` });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Failed to upload attachment.' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject cannot be empty.' });
      return;
    }
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Message cannot be empty.' });
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
          customFrom: senderEmail,
          attachments
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: 'Email Sent', description: 'Your message has been dispatched successfully.' });
        setSubject('');
        setMessage('');
        setAttachments([]);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Compose an email to {recipientName ? `${recipientName} (${toEmail})` : toEmail}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {senderEmail && (
            <div className="text-xs text-muted-foreground flex gap-1">
              <span>Sending as:</span>
              <span className="font-semibold text-foreground">{senderEmail}</span>
            </div>
          )}
          
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

          {/* Attachments List & Uploader */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-wider">Attachments</Label>
              <label className="text-xs font-semibold text-[#095c7b] hover:text-[#053647] cursor-pointer flex items-center gap-1">
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                <span>{isUploading ? 'Uploading...' : 'Attach File'}</span>
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  disabled={isUploading}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-slate-700 py-0.5">
                    <span className="truncate max-w-[85%]">{file.name}</span>
                    <button 
                      onClick={() => removeAttachment(file.url)}
                      className="text-slate-400 hover:text-red-500 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || isUploading || !message.trim() || !subject.trim()} className="gap-2">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
