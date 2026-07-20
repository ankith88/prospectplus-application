"use client";

import { useEffect, useState } from "react";
import { Gauge, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface PerformanceTimerProps {
  loadTime: number | null;
  pageName: string;
}

export default function PerformanceTimer({ loadTime, pageName }: PerformanceTimerProps) {
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  if (loadTime === null) return null;

  const isSlow = loadTime > 1500; // Highlight if load time is over 1.5 seconds

  const seconds = (loadTime / 1000).toFixed(2);

  const ticketTitle = `[Performance Report] Slow Page Load on ${pageName}`;
  const ticketDesc = `User reported performance issue:\n\n- Page: ${pageName}\n- Route: ${currentPath}\n- Recorded Load Time: ${loadTime}ms (${seconds}s)\n\n(Please investigate database query efficiency and index definitions for this page.)`;
  const reportUrl = `/app-tickets/create?title=${encodeURIComponent(ticketTitle)}&desc=${encodeURIComponent(ticketDesc)}&type=issue`;

  return (
    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2.5 py-1 text-[11px] font-medium max-h-[28px]">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <Gauge className={`h-3 w-3 ${isSlow ? "text-amber-500 animate-pulse" : "text-emerald-500"}`} />
        <span>Load: <strong className={isSlow ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-emerald-600 dark:text-emerald-400"}>{seconds}s</strong></span>
      </div>
      <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
      <Link 
        href={reportUrl}
        className="flex items-center gap-1 text-[#095c7b] hover:text-[#0b4b63] dark:text-[#38bdf8] dark:hover:text-[#0ea5e9] hover:underline"
      >
        {isSlow && <AlertTriangle className="h-3 w-3 text-amber-500" />}
        <span>Report</span>
      </Link>
    </div>
  );
}
