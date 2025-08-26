
export function Loader() {
  return (
    <div className="flex items-center justify-center space-x-2">
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse [animation-delay:-0.3s]"></div>
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse [animation-delay:-0.15s]"></div>
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse"></div>
    </div>
  );
}

import Image from "next/image";

export function FullScreenLoader({ message }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                 <Image
                    src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
                    width={140}
                    height={40}
                    alt="MailPlus CRM Logo"
                    data-ai-hint="logo"
                />
                <Loader />
                {message && <p className="text-muted-foreground">{message}</p>}
            </div>
        </div>
    );
}
