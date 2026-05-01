import { cn } from "@/lib/utils";
import Image from "next/image";

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
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                 <div className="logo-text !text-[var(--ink)] !text-2xl mb-2">
                    prospect<span className="logo-plus">.plus</span>
                </div>
                <Loader />
                {message && <p className="text-muted-foreground">{message}</p>}
            </div>
        </div>
    );
}
