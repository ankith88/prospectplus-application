"use client";

import { useAuth } from '@/hooks/use-auth';
import { AskClient } from './ask-client';
import { Sparkles, Hammer } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function AskPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-65px)] items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
      </div>
    );
  }

  const allowedUid = "ncyhwLtOG1W7TZ43PkYCcObeCAf2";

  if (!user || user.uid !== allowedUid) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-65px)] bg-background text-foreground p-6">
        <div className="max-w-md w-full bg-white border border-border rounded-2xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-[#095c7b]/10 flex items-center justify-center text-[#095c7b]">
            <Hammer className="h-7 w-7" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#1A3D33] font-serif">Feature Coming Soon</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>Ask Prospect+</strong> is currently under active development. This natural-language query tool is coming soon to your workspace!
            </p>
          </div>
          <div className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-border/40 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#095c7b]" />
            Under Construction
          </div>
        </div>
      </div>
    );
  }

  return <AskClient />;
}
