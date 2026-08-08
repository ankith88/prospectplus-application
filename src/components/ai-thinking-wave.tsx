"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiThinkingWaveProps {
  text?: string;
  className?: string;
}

export function AiThinkingWave({
  text = "Ask Prospect+ is analyzing data...",
  className = "",
}: AiThinkingWaveProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-[#095c7b]/10 to-teal-500/10 border border-sky-500/20 backdrop-blur-md shadow-xs animate-in fade-in-50 duration-300",
        className
      )}
    >
      <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-tr from-[#095c7b] to-sky-500 text-white shadow-sm shrink-0">
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#095c7b] dark:text-sky-400 truncate">
          {text}
        </p>

        {/* Audio Waveform Bars */}
        <div className="flex items-center gap-1 mt-1.5 h-3">
          <span className="w-1 bg-[#095c7b] rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
          <span className="w-1 bg-sky-500 rounded-full animate-[bounce_1s_infinite_200ms] h-3/4" />
          <span className="w-1 bg-teal-500 rounded-full animate-[bounce_1s_infinite_300ms] h-full" />
          <span className="w-1 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_400ms] h-1/2" />
          <span className="w-1 bg-sky-400 rounded-full animate-[bounce_1s_infinite_500ms] h-4/5" />
        </div>
      </div>
    </div>
  );
}
