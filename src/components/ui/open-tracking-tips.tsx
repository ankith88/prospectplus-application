'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, ShieldCheck, MousePointerClick, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpenTrackingTipsProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function OpenTrackingTips({ className, defaultExpanded = false }: OpenTrackingTipsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("bg-sky-50/90 border border-sky-200/90 rounded-md p-3 text-sky-900 transition-all", className)}>
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 font-semibold text-xs text-sky-950">
          <Info className="h-4 w-4 text-[#095c7b] shrink-0" />
          <span>💡 Open Tracking Best Practices & Tips</span>
        </div>
        <button 
          type="button"
          className="text-sky-700 hover:text-sky-950 text-xs font-semibold flex items-center gap-0.5"
        >
          <span>{isExpanded ? 'Hide' : 'Tips'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-sky-200/60 space-y-2 text-[11px] text-sky-900 leading-normal animate-in fade-in-50 duration-150">
          <div className="flex items-start gap-1.5">
            <Image className="h-3.5 w-3.5 text-[#095c7b] shrink-0 mt-0.5" />
            <div>
              <strong>Instant Pixel Tracking:</strong> An embedded 1x1 pixel triggers an in-app popup alert and inbox email notification as soon as the email is opened.
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Image Blocking Fallback:</strong> If the recipient's email client (e.g. Outlook security) blocks external images, tracking automatically fires when they click any link or view their quote page.
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Pro Tip:</strong> Always include actionable links or buttons (like <em>Quote Link</em> or <em>Order Form Link</em>) in your message for 100% tracking accuracy even if images are turned off.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
