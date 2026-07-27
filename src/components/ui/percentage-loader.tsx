"use client"

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface PercentageLoaderProps {
  label?: string;
  sublabel?: string;
  className?: string;
  minHeight?: string;
  value?: number;
}

export function PercentageLoader({
  label = "Loading data...",
  sublabel,
  className = "",
  minHeight = "min-h-[220px]",
  value
}: PercentageLoaderProps) {
  const [displayProgress, setDisplayProgress] = useState(value !== undefined ? value : 10);

  useEffect(() => {
    if (value !== undefined) {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          if (prev >= value) {
            clearInterval(interval);
            return value;
          }
          const step = Math.max(1, Math.ceil((value - prev) / 3));
          return Math.min(value, prev + step);
        });
      }, 25);
      return () => clearInterval(interval);
    } else {
      const timer = setInterval(() => {
        setDisplayProgress((prev) => {
          if (prev >= 98) {
            clearInterval(timer);
            return 98;
          }
          const diff = Math.max(1, Math.floor((99 - prev) / 6));
          return Math.min(98, prev + diff);
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [value]);

  const currentVal = Math.min(100, Math.max(0, Math.round(displayProgress)));

  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-card border rounded-xl shadow-xs w-full ${minHeight} ${className}`}>
      <div className="w-full max-w-md space-y-3.5 text-center">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 text-foreground">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span>{label}</span>
          </div>
          <span className="font-bold text-primary font-mono text-sm">{currentVal}%</span>
        </div>
        
        <Progress value={currentVal} className="h-2 w-full bg-muted/80 transition-all duration-300" />
        
        {sublabel && (
          <p className="text-[11px] text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
