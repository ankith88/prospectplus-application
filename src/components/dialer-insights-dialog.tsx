'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, Sparkles, Zap, Copy, Check, Building, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface DialerInsightsData {
  leadId?: string;
  companyName?: string;
  phoneNumber?: string;
  suggestedOpener?: string;
  suggestedPersonalisation?: string;
  apRelationship?: string;
}

interface DialerInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DialerInsightsData | null;
  onConfirmDial: () => void;
}

export function DialerInsightsDialog({
  open,
  onOpenChange,
  data,
  onConfirmDial
}: DialerInsightsDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!data) return null;

  const handleCopy = (text?: string, fieldName?: string) => {
    if (!text || !fieldName) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDial = () => {
    onConfirmDial();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-slate-200 dark:border-slate-800 shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-900">
        <DialogHeader className="bg-gradient-to-r from-[#095c7b] to-[#127fa8] text-white p-6 pb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-white/10 rounded-lg text-amber-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Pre-Call AI Intelligence
                <Badge variant="outline" className="bg-amber-400/20 text-amber-200 border-amber-300/30 text-[10px] font-semibold">
                  Call Briefing
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-200 mt-0.5">
                {data.companyName ? `Intelligence briefing for ${data.companyName}` : 'Review openers & signals before dialing.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Suggested Opener */}
          {data.suggestedOpener && (
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Suggested Opener
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  onClick={() => handleCopy(data.suggestedOpener, 'opener')}
                >
                  {copiedField === 'opener' ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copy Opener
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-amber-200/60 dark:border-amber-800/60 leading-relaxed">
                "{data.suggestedOpener}"
              </p>
            </div>
          )}

          {/* Suggested Personalisation */}
          {data.suggestedPersonalisation && (
            <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Suggested Personalisation
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  onClick={() => handleCopy(data.suggestedPersonalisation, 'personalisation')}
                >
                  {copiedField === 'personalisation' ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg border border-purple-200/60 dark:border-purple-800/60">
                {data.suggestedPersonalisation}
              </p>
            </div>
          )}

          {/* AP Relationship */}
          {data.apRelationship && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#095c7b] dark:text-[#38bdf8]" />
                  AP Relationship
                </span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold px-2 py-0.5">
                  AP Signal
                </Badge>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                {data.apRelationship}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex flex-row items-center justify-between sm:justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600 dark:text-slate-400"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDial}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 flex items-center gap-2 shadow-sm"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Dial {data.phoneNumber ? `(${data.phoneNumber})` : 'Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
