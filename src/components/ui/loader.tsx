import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse [animation-delay:-0.3s]"></div>
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse [animation-delay:-0.15s]"></div>
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse"></div>
    </div>
  );
}

export function FullScreenLoader({ message }: { message?: string }) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl backdrop-blur-lg max-w-sm w-full mx-4 text-center">
                 <div className="logo-text !text-[var(--ink)] !text-2xl mb-1">
                    prospect<span className="logo-plus">.plus</span>
                </div>
                <Loader className="my-1" />
                {message && <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{message}</p>}
                
                <div className="flex items-center gap-2 text-xs font-semibold text-[#095c7b] bg-sky-50 dark:bg-sky-950/50 px-3.5 py-1.5 rounded-full border border-sky-200 dark:border-sky-800">
                    <Clock className="h-3.5 w-3.5 animate-spin text-[#095c7b]" />
                    <span>Loading data... <strong>{seconds}s</strong></span>
                </div>
            </div>
        </div>
    );
}
