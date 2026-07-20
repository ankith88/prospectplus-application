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

  const ticketTitle = `[Performance Report] Slow Page Load on ${pageName}`;
  const ticketDesc = `User reported performance issue:\n\n- Page: ${pageName}\n- Route: ${currentPath}\n- Recorded Load Time: ${loadTime}ms\n\n(Please investigate database query efficiency and index definitions for this page.)`;
  const reportUrl = `/app-tickets/create?title=${encodeURIComponent(ticketTitle)}&desc=${encodeURIComponent(ticketDesc)}&type=issue`;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 bg-[#ffffff]/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 shadow-lg text-xs font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
        <Gauge className={`h-3.5 w-3.5 ${isSlow ? "text-amber-500 animate-pulse" : "text-emerald-500"}`} />
        <span>Load: <strong className={isSlow ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400"}>{loadTime}ms</strong></span>
      </div>
      <div className="h-3 w-[1px] bg-gray-200 dark:bg-gray-800"></div>
      <Link 
        href={reportUrl}
        className="flex items-center gap-1 text-[#095c7b] hover:text-[#0b4b63] dark:text-[#38bdf8] dark:hover:text-[#0ea5e9] hover:underline"
      >
        {isSlow && <AlertTriangle className="h-3 w-3 text-amber-500" />}
        <span>Report Issue</span>
      </Link>
    </div>
  );
}
