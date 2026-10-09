'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullScreenLoader } from '@/components/ui/loader';
import { Mail, RefreshCw, ArrowLeft, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

function VerificationPendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { sendEmailVerificationLink } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const [targetEmail, setTargetEmail] = useState(emailParam);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (emailParam) {
      setTargetEmail(emailParam);
    }
  }, [emailParam]);

  // 30-second resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!targetEmail) return;

    setIsResending(true);
    try {
      await sendEmailVerificationLink(targetEmail);
      setCooldown(30);
      toast({
        title: 'Verification Email Sent',
        description: `A fresh link has been dispatched to ${targetEmail}.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Resend',
        description: err.message || 'Could not send verification email. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f7f8] to-[#e8eef1] flex flex-col justify-center items-center p-4">
      {/* Brand Header Banner Card */}
      <Card className="w-full max-w-lg shadow-xl border-border overflow-hidden bg-card animate-in fade-in zoom-in-95 duration-200">
        {/* Navy Header */}
        <div className="bg-[#095c7b] py-6 px-6 text-center border-b border-[#074760]">
          <img
            src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
            alt="MailPlus Logo"
            className="h-10 mx-auto object-contain brightness-0 invert"
          />
          <p className="text-white/80 text-xs font-medium mt-2 tracking-wide uppercase">
            Prospect+ Security & Verification
          </p>
        </div>

        <CardContent className="pt-8 pb-6 px-6 sm:px-8 space-y-6">
          {/* Main Icon & Title */}
          <div className="text-center space-y-3">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center mx-auto text-[#095c7b] border border-blue-200 shadow-sm animate-pulse">
              <Mail className="h-8 w-8" />
            </div>
            
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 mb-2">
                <ShieldAlert className="h-3.5 w-3.5" />
                Email Verification Required
              </div>
              <h1 className="text-2xl font-bold text-foreground">Check Your Inbox</h1>
            </div>

            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              We've sent a secure verification link to your email address:
            </p>

            {/* Highlighted Email Box */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center">
              <span className="font-mono text-sm font-bold text-[#095c7b] dark:text-blue-400 select-all">
                {targetEmail || 'your email address'}
              </span>
            </div>
          </div>

          {/* Step-by-Step Instructions Box */}
          <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-2.5 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#095c7b]" />
              How to continue:
            </h3>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#095c7b] shrink-0">1.</span>
                <span>Open your inbox and look for an email from <strong>Prospect+ by MailPlus</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#095c7b] shrink-0">2.</span>
                <span>Click the <strong>"Verify Email Address"</strong> button in the email.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#095c7b] shrink-0">3.</span>
                <span>Complete <strong>Two-Factor Authentication</strong> to finish signing in.</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-semibold py-2.5 shadow-sm"
            >
              {isResending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending Link...
                </span>
              ) : cooldown > 0 ? (
                `Resend Verification Email (${cooldown}s)`
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/signin"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Sign in with a different account
              </Link>
            </div>
          </div>

          {/* Troubleshooting Help */}
          <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground leading-relaxed">
            <p className="flex items-center justify-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Didn't receive the email? Check your junk or spam folder, or contact{' '}
              <a
                href="mailto:mailplusit@mailplus.com.au"
                className="text-[#095c7b] dark:text-blue-400 underline font-medium"
              >
                MailPlus IT Support
              </a>.
            </p>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/40 py-3 px-6 border-t border-border flex justify-center">
          <p className="text-[11px] text-muted-foreground text-center">
            &copy; 2026 MailPlus Australia. Protected by Enterprise Authentication.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerificationPendingPage() {
  return (
    <Suspense fallback={<FullScreenLoader message="Loading verification status..." />}>
      <VerificationPendingContent />
    </Suspense>
  );
}
