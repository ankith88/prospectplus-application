'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Upload, Send, X } from 'lucide-react';

interface MissingScfDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadName?: string;
  onUploadManualScf: () => void;
  onSendDigitalScf: () => void;
}

export function MissingScfDialog({
  isOpen,
  onOpenChange,
  leadName = 'this lead',
  onUploadManualScf,
  onSendDigitalScf,
}: MissingScfDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-amber-600">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-full shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg">Signed SCF Required</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2 leading-relaxed">
            There is currently no accepted or signed Service Commencement Form (SCF) for{' '}
            <strong className="text-slate-900 dark:text-slate-100">{leadName}</strong>.
            <br />
            <br />
            To sign up this lead, MailPlus requires an accepted Service Commencement Form and agreed
            Terms &amp; Conditions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border">
          <p className="font-semibold text-slate-800 dark:text-slate-200">How would you like to proceed?</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Upload Manual SCF:</strong> If you or the account manager received a physical
              or paper-signed form, upload the document and record the date the T&amp;C&apos;s were
              accepted.
            </li>
            <li>
              <strong>Send Digital SCF:</strong> Generate a formal service quote and email an SCF
              link for the customer to review and sign electronically.
            </li>
          </ul>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              onSendDigitalScf();
            }}
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            Send Digital SCF
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onUploadManualScf();
            }}
            className="w-full sm:w-auto bg-[#095c7b] hover:bg-[#064258] text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Manual SCF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
