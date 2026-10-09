'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { ShieldCheck, Smartphone, RefreshCw, ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  // 2FA Verification State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [mfaUid, setMfaUid] = useState<string | null>(null);
  const [mfaMaskedMobile, setMfaMaskedMobile] = useState<string>('');
  const [mfaOtpCode, setMfaOtpCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isResending2FA, setIsResending2FA] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();
  const { 
    signIn, 
    signOut,
    user, 
    is2FAVerified, 
    loading: authLoading, 
    isSigningIn, 
    sendPasswordReset,
    verify2FACode,
    resend2FACode,
  } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!authLoading && user && is2FAVerified && !is2FAModalOpen) {
      router.replace('/');
    }
  }, [user, is2FAVerified, authLoading, is2FAModalOpen, router]);

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
      if (result && result.requires2FA) {
        setMfaUid(result.uid);
        setMfaMaskedMobile(result.maskedMobile || 'your mobile number');
        setMfaOtpCode('');
        setIs2FAModalOpen(true);
        setResendCooldown(30);
        toast({
          title: "2FA Code Sent",
          description: `A 6-digit verification code was sent to ${result.maskedMobile || 'your registered mobile'}.`,
        });
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
        description: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setIsVerifying2FA(true);
    try {
      await verify2FACode(mfaUid, mfaOtpCode.trim());
      toast({
        title: "Verification Successful",
        description: "Welcome to ProspectPlus!",
      });
      setIs2FAModalOpen(false);
      router.replace('/');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || "Invalid or expired verification code.",
      });
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleResend2FA = async () => {
    if (!mfaUid || resendCooldown > 0) return;
    setIsResending2FA(true);
    try {
      const res = await resend2FACode(mfaUid);
      setResendCooldown(30);
      toast({
        title: "Code Resent",
        description: `A new 6-digit code has been sent to ${res.maskedMobile || mfaMaskedMobile}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: err.message || "Failed to resend verification code.",
      });
    } finally {
      setIsResending2FA(false);
    }
  };

  const handleCancel2FA = async () => {
    setIs2FAModalOpen(false);
    setMfaUid(null);
    setMfaOtpCode('');
    await signOut();
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email address.' });
        return;
    }
    setIsSendingReset(true);
    try {
        await sendPasswordReset(resetEmail);
        toast({ title: 'Success', description: 'If an account exists for that email, a password reset link has been sent.' });
        setIsResetDialogOpen(false);
        setResetEmail('');
    } catch (error: any) {
        console.error('Password reset failed:', error);
        toast({ title: 'Success', description: 'If an account exists for that email, a password reset link has been sent.' });
        setIsResetDialogOpen(false);
        setResetEmail('');
    } finally {
        setIsSendingReset(false);
    }
  };

  if (authLoading) {
      return <FullScreenLoader message="Loading..." />;
  }

  return (
    <>
    {(isSigningIn) && <FullScreenLoader message="Signing in..." />}
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
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
            <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
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
                            className="p-0 h-auto text-xs"
                            onClick={() => setIsResetDialogOpen(true)}
                        >
                            Forgot password?
                        </Button>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSigningIn}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isSigningIn}>
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
    </div>

    {/* 2FA Verification Modal */}
    <Dialog open={is2FAModalOpen} onOpenChange={(open) => !open && handleCancel2FA()}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center sm:text-center items-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <DialogTitle className="text-xl">Two-Factor Authentication</DialogTitle>
                <DialogDescription className="text-center text-sm pt-1">
                    Enter the 6-digit verification code sent via SMS to <span className="font-semibold text-foreground">{mfaMaskedMobile}</span>.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleVerify2FASubmit} className="space-y-5 py-3">
                <div className="space-y-2 text-center">
                    <Label htmlFor="mfa-code" className="sr-only">6-Digit Verification Code</Label>
                    <Input
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="••••••"
                        autoFocus
                        value={mfaOtpCode}
                        onChange={(e) => setMfaOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-2xl font-mono tracking-widest h-12 text-blue-600 dark:text-blue-400 font-bold"
                        disabled={isVerifying2FA}
                    />
                    <p className="text-xs text-muted-foreground pt-1">
                        Code expires in 5 minutes.
                    </p>
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
                            `Resend SMS in ${resendCooldown}s`
                        ) : (
                            "Resend SMS Code"
                        )}
                    </Button>
                </div>

                <DialogFooter className="sm:justify-stretch">
                    <Button 
                        type="submit" 
                        className="w-full bg-[#095c7b] hover:bg-[#07465e] text-white" 
                        disabled={isVerifying2FA || mfaOtpCode.length !== 6}
                    >
                        {isVerifying2FA ? <Loader className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Verify & Continue
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

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
                        placeholder="m@example.com"
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
