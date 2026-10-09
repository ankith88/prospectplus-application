'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { ShieldCheck, Smartphone, KeyRound, RefreshCw, ArrowLeft, Mail, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

function SignInContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // 2FA Verification State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [mfaUid, setMfaUid] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'sms' | 'totp' | 'totp_setup_needed'>('sms');
  const [mfaMaskedMobile, setMfaMaskedMobile] = useState<string>('');
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState<string>('');
  const [mfaOtpCode, setMfaOtpCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isResending2FA, setIsResending2FA] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerifiedFromQuery = searchParams.get('verified') === 'true';

  const { 
    signIn, 
    signOut,
    user, 
    userProfile,
    is2FAVerified, 
    loading: authLoading, 
    isSigningIn, 
    sendPasswordReset,
    sendEmailVerificationLink,
    verify2FACode,
    resend2FACode,
  } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!authLoading && user && user.emailVerified && is2FAVerified && !is2FAModalOpen) {
      router.replace('/');
    }
  }, [user, is2FAVerified, authLoading, is2FAModalOpen, router]);

  // If user is already authenticated in Firebase Auth session but requires 2FA and not yet verified
  useEffect(() => {
    if (!authLoading && user && user.emailVerified && userProfile?.requires2FA && !is2FAVerified && !is2FAModalOpen && !mfaUid) {
      const init2FAChallenge = async () => {
        try {
          const res = await fetch('/api/auth/2fa/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, email: user.email }),
          });
          const data = await res.json();
          if (data.success) {
            setMfaUid(user.uid);
            setMfaMethod((data.method as any) || (userProfile.twoFactorMethod as any) || 'sms');
            setMfaMaskedMobile(data.maskedMobile || '');
            setMfaSecret(data.secret || '');
            setMfaQrDataUrl(data.qrDataUrl || '');
            setIs2FAModalOpen(true);
          }
        } catch (e) {
          console.error('[2FA Auto-Init Error]:', e);
        }
      };
      init2FAChallenge();
    }
  }, [authLoading, user, userProfile, is2FAVerified, is2FAModalOpen, mfaUid]);

  // Countdown timer for 2FA resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result: any = await signIn(email, password);

      // Check for Email Verification Requirement
      if (result && result.requiresEmailVerification) {
        const targetEmail = result.email || email;
        router.push(`/verify-email/pending?email=${encodeURIComponent(targetEmail)}`);
        return;
      }

      // Check for 2FA Challenge Requirement
      if (result && result.requires2FA) {
        setMfaUid(result.uid);
        setMfaMethod((result.method as any) || 'sms');
        setMfaMaskedMobile(result.maskedMobile || '');
        setMfaSecret(result.secret || '');
        setMfaQrDataUrl(result.qrDataUrl || '');
        setMfaOtpCode('');
        setIs2FAModalOpen(true);
        setResendCooldown(30);

        if (result.method === 'sms') {
          toast({
            title: "2FA SMS Code Sent",
            description: `A 6-digit code was sent to ${result.maskedMobile || 'your mobile'}.`,
          });
        } else if (result.method === 'totp_setup_needed') {
          toast({
            title: "Google Authenticator Setup",
            description: "Scan the QR code to connect your authenticator app.",
          });
        }
        return;
      }
      // Standard redirect handled by useEffect
    } catch (error: any) {
      console.error("Sign in failed:", error);
      let errorMessage = "An unexpected error occurred. Please check your credentials.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/user-disabled-custom' || error.code === 'auth/user-disabled') {
          errorMessage = "Your account has been disabled. Please contact an administrator for access.";
      } else if (error.code === 'auth/2fa-no-mobile' || error.code === 'NO_MOBILE_NUMBER') {
          errorMessage = error.message || "2FA is required for your account, but no mobile number is registered. Please contact a Super Administrator.";
      } else {
          errorMessage = error.message;
      }
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: errorMessage,
      });
    }
  };

  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaUid || !mfaOtpCode || mfaOtpCode.trim().length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a complete 6-digit verification code.",
      });
      return;
    }

    setIsVerifying2FA(true);
    try {
      await verify2FACode(
        mfaUid, 
        mfaOtpCode.trim(), 
        mfaMethod === 'totp_setup_needed' ? mfaSecret : undefined
      );

      toast({
        title: "Authentication Successful",
        description: "Security check passed. Logging into Prospect+...",
      });

      setIs2FAModalOpen(false);
      router.replace('/');
    } catch (error: any) {
      console.error("2FA verification failed:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "The code you entered is invalid or has expired. Please try again.",
      });
      setMfaOtpCode('');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleResend2FA = async () => {
    if (!mfaUid || resendCooldown > 0) return;
    setIsResending2FA(true);
    try {
      const data = await resend2FACode(mfaUid);
      setResendCooldown(30);
      if (data.method === 'sms') {
        toast({
          title: "New SMS Code Sent",
          description: `A fresh 6-digit code has been sent to ${data.maskedMobile || 'your phone'}.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: error.message || "Could not resend verification code. Please try again later.",
      });
    } finally {
      setIsResending2FA(false);
    }
  };

  const handleCancel2FA = async () => {
    setIs2FAModalOpen(false);
    setMfaUid(null);
    setMfaOtpCode('');
    setMfaSecret('');
    setMfaQrDataUrl('');
    await signOut();
  };

  const handlePasswordReset = async () => {
      if (!resetEmail) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Please enter your email address.",
          });
          return;
      }
      setIsSendingReset(true);
      try {
          await sendPasswordReset(resetEmail);
          toast({
              title: "Password Reset Email Sent",
              description: "If an account exists with that email, a password reset link has been sent.",
          });
          setIsResetDialogOpen(false);
          setResetEmail('');
      } catch (error: any) {
           console.error("Password reset failed:", error);
          toast({
              variant: "destructive",
              title: "Password Reset Failed",
              description: error.message || "An error occurred while sending the password reset email.",
          });
      } finally {
          setIsSendingReset(false);
      }
  }

  if (authLoading) {
      return <FullScreenLoader message="Authenticating..." />;
  }

  return (
    <>
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      {is2FAModalOpen ? (
        /* 2FA Challenge Card */
        <Card className={`w-full ${mfaMethod === 'totp_setup_needed' ? 'max-w-lg' : 'max-w-md'} shadow-2xl border-border animate-in fade-in zoom-in-95 duration-200`}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              {mfaMethod === 'sms' ? (
                <Smartphone className="w-6 h-6 text-primary" />
              ) : (
                <KeyRound className="w-6 h-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              {mfaMethod === 'totp_setup_needed' 
                ? "Set Up Google Authenticator" 
                : mfaMethod === 'totp' 
                  ? "Google Authenticator 2FA" 
                  : "Two-Factor Verification"}
            </CardTitle>
            <CardDescription className="text-xs max-w-sm mx-auto">
              {mfaMethod === 'totp_setup_needed' ? (
                "Scan the QR code below using Google Authenticator on your mobile device to complete initial setup."
              ) : mfaMethod === 'totp' ? (
                "Open Google Authenticator on your phone and enter the current 6-digit verification code."
              ) : (
                <>Enter the 6-digit code sent to <strong className="text-foreground">{mfaMaskedMobile || 'your mobile'}</strong> to complete sign in.</>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {mfaMethod === 'totp_setup_needed' && (
              <div className="space-y-4">
                {mfaQrDataUrl && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-inner w-fit mx-auto">
                    <img 
                      src={mfaQrDataUrl} 
                      alt="TOTP QR Code" 
                      className="w-48 h-48 rounded"
                    />
                    <p className="text-[11px] text-slate-500 mt-2 font-medium">Scan with Google Authenticator</p>
                  </div>
                )}

                {mfaSecret && (
                  <div className="bg-muted/60 p-3 rounded-lg border border-border text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Can't scan? Enter key manually:
                    </p>
                    <code className="text-xs font-mono font-bold text-primary tracking-widest select-all block bg-background py-1 px-2 rounded border border-border">
                      {mfaSecret}
                    </code>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleVerify2FASubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-center block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {mfaMethod === 'totp_setup_needed' 
                    ? "Enter 6-Digit Code to Confirm Setup" 
                    : "6-Digit Security Code"}
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                  value={mfaOtpCode}
                  onChange={(e) => setMfaOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl font-mono tracking-widest h-12 text-primary font-bold bg-background"
                  disabled={isVerifying2FA}
                />
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={handleCancel2FA}
                  disabled={isVerifying2FA}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </Button>

                {mfaMethod === 'sms' && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={handleResend2FA}
                    disabled={resendCooldown > 0 || isResending2FA || isVerifying2FA}
                  >
                    {isResending2FA ? (
                      <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Sending...</span>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      "Resend SMS Code"
                    )}
                  </Button>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#095c7b] hover:bg-[#07465e] text-white h-10 font-semibold shadow-sm" 
                disabled={isVerifying2FA || mfaOtpCode.length !== 6}
              >
                {isVerifying2FA ? <Loader className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {mfaMethod === 'totp_setup_needed' ? 'Confirm & Sign In' : 'Verify & Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="flex flex-col items-center text-center">
              <div className="logo-text !text-[var(--ink)] !text-3xl mb-2">
                PROSPECT<span className="logo-plus">.plus</span>
              </div>
              <CardDescription className="text-center">
                  Sign in to your account
              </CardDescription>
          </CardHeader>
          <CardContent>
              {isVerifiedFromQuery && (
                <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Email Verified!</strong>
                    Please enter your credentials to complete Two-Factor Authentication.
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      placeholder="name@mailplus.com.au"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSigningIn}
                  />
                  </div>
                   <div className="space-y-2">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="px-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                  setResetEmail(email);
                                  setIsResetDialogOpen(true);
                              }}
                              tabIndex={-1}
                          >
                              Forgot Password?
                          </Button>
                      </div>
                      <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isSigningIn}
                      />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningIn}>
                   {isSigningIn && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                   Sign In
                  </Button>
              </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center text-center gap-4 text-sm text-muted-foreground">
             <div>By signing in, you agree to our terms of service.</div>
             <div>
              Need access or want to sign up? Contact{" "}
              <Link href="mailto:ankith.ravindran@mailplus.com.au" className="underline text-primary font-medium">
                  Ankith Ravindran
              </Link>
              .
             </div>
          </CardFooter>
        </Card>
      )}
    </div>

    {/* Password Reset Modal */}
    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                    Enter your email address below and we'll send you a link to reset your password.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@mailplus.com.au"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isSendingReset}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSendingReset}>
                        Cancel
                    </Button>
                </DialogClose>
                <Button onClick={handlePasswordReset} disabled={isSendingReset}>
                    {isSendingReset ? <Loader/> : "Send Reset Link"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<FullScreenLoader message="Loading sign in..." />}>
      <SignInContent />
    </Suspense>
  );
}
