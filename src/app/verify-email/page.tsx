'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, applyActionCode } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';

function VerifyEmailHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    if (!oobCode) {
      setStatus('idle');
      return;
    }

    const verifyCode = async () => {
      try {
        if (!app) {
          throw new Error('Firebase application not initialized.');
        }
        const auth = getAuth(app);
        await applyActionCode(auth, oobCode);
        
        // Reload current user if session is active
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        setStatus('success');
      } catch (err: any) {
        console.error('[Email Verification Error]:', err);
        setStatus('error');
        if (err.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link is invalid, expired, or has already been used.');
        } else if (err.code === 'auth/expired-action-code') {
          setErrorMessage('This verification link has expired. Please request a new verification email.');
        } else {
          setErrorMessage(err.message || 'An error occurred while verifying your email address.');
        }
      }
    };

    verifyCode();
  }, [searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email address.' });
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch('/api/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Verification Link Sent',
          description: `A fresh verification email has been dispatched to ${resendEmail}.`,
        });
        setResendEmail('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Send',
          description: data.message || 'Could not send verification email.',
        });
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e.message || 'An error occurred.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f7f8] to-[#e8eef1] flex flex-col justify-center items-center p-4">
      {/* Brand Header Banner Card */}
      <Card className="w-full max-w-md shadow-xl border-border overflow-hidden bg-card">
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

        <CardContent className="pt-8 pb-6 px-6">
          {status === 'loading' && (
            <div className="text-center py-6 space-y-4">
              <RefreshCw className="h-12 w-12 text-[#095c7b] animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Verifying Email Address...</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Please wait while we validate your security credentials with MailPlus.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200 shadow-sm animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">Email Verified!</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Your email address has been successfully verified for Prospect+.
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  Next Step: Two-Factor Authentication
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700/90 dark:text-emerald-400">
                  You will now be redirected to complete your 2FA Google Authenticator challenge to enter the application.
                </p>
              </div>

              <Button
                onClick={() => router.push('/signin?verified=true')}
                className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-semibold py-2.5 mt-2 flex items-center justify-center gap-2 shadow-sm"
              >
                Continue to Sign In & 2FA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="h-16 w-16 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center mx-auto text-amber-600 border border-amber-200 shadow-sm animate-in zoom-in-75 duration-300">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Verification Link Expired</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              <form onSubmit={handleResend} className="space-y-3 pt-3 border-t border-border text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="resend-email" className="text-xs font-semibold">
                    Request a Fresh Verification Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="name@mailplus.com.au"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isResending}
                  className="w-full bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-semibold py-2"
                >
                  {isResending ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Sending Link...
                    </span>
                  ) : (
                    'Send New Verification Email'
                  )}
                </Button>
              </form>

              <Button
                variant="ghost"
                onClick={() => router.push('/signin')}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Return to Sign In
              </Button>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center py-4 space-y-4">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center mx-auto text-[#095c7b] border border-blue-200 shadow-sm">
                <Mail className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Email Verification Required</h2>
                <p className="text-sm text-muted-foreground">
                  Please enter your email to receive a secure Prospect+ verification link.
                </p>
              </div>

              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="idle-email" className="text-xs font-semibold">
                    Your Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="idle-email"
                      type="email"
                      placeholder="name@mailplus.com.au"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isResending}
                  className="w-full bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-semibold py-2"
                >
                  {isResending ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Sending Link...
                    </span>
                  ) : (
                    'Send Verification Link'
                  )}
                </Button>
              </form>

              <Button
                variant="ghost"
                onClick={() => router.push('/signin')}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Back to Sign In
              </Button>
            </div>
          )}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<FullScreenLoader message="Loading verification portal..." />}>
      <VerifyEmailHandler />
    </Suspense>
  );
}
