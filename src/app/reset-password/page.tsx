'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const oobCode = searchParams.get('oobCode');
  
  const [verifying, setVerifying] = useState(true);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);
  const [invalidCodeError, setInvalidCodeError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setVerifying(false);
      setInvalidCodeError("No reset code provided. Please request a new password reset link.");
      return;
    }

    if (!auth) {
      setVerifying(false);
      setInvalidCodeError("Authentication service is unavailable. Please try again later.");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setTargetEmail(email);
        setVerifying(false);
      })
      .catch((err) => {
        console.error("Code verification failed:", err);
        setVerifying(false);
        if (err.code === 'auth/expired-action-code') {
          setInvalidCodeError("This password reset link has expired. Reset links are only valid for a limited time.");
        } else if (err.code === 'auth/invalid-action-code') {
          setInvalidCodeError("This password reset link is invalid or has already been used.");
        } else {
          setInvalidCodeError("Invalid or expired password reset link. Please request a new one.");
        }
      });
  }, [oobCode]);

  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oobCode || !auth) return;

    if (!hasMinLength) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Your password must be at least 8 characters long.",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        variant: "destructive",
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields match exactly.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setResetSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now sign in with your new password.",
      });
    } catch (error: any) {
      console.error("Failed to reset password:", error);
      let msg = "Failed to update password. Please try requesting a new reset link.";
      if (error.code === 'auth/weak-password') {
        msg = "Please choose a stronger password.";
      } else if (error.code === 'auth/expired-action-code' || error.code === 'auth/invalid-action-code') {
        msg = "This reset link has expired or is invalid. Please request a new link.";
      }
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifying) {
    return <FullScreenLoader message="Verifying password reset request..." />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-xl border-slate-200 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-[#095c7b] py-6 px-6 text-center border-b border-[#074b64]">
          <div className="text-[#EAF044] font-black text-2xl tracking-tight flex items-center justify-center gap-1.5">
            <span>PROSPECT</span>
            <span className="bg-[#EAF044] text-[#095c7b] text-xs px-1.5 py-0.5 rounded font-extrabold uppercase tracking-widest">
              PLUS
            </span>
          </div>
          <p className="text-sky-100/80 text-xs mt-1 font-medium">MailPlus Business Logistics CRM</p>
        </div>

        {/* State 1: Invalid Code Error */}
        {invalidCodeError ? (
          <>
            <CardHeader className="text-center pb-3 pt-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2 border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">Reset Link Expired or Invalid</CardTitle>
              <CardDescription className="text-slate-600 text-sm mt-1">
                {invalidCodeError}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-6 px-6">
              <Button 
                className="w-full bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold"
                onClick={() => router.push('/signin')}
              >
                Back to Sign In
              </Button>
            </CardFooter>
          </>
        ) : resetSuccess ? (
          /* State 2: Reset Success */
          <>
            <CardHeader className="text-center pb-3 pt-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-200 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Password Successfully Updated</CardTitle>
              <CardDescription className="text-slate-600 text-sm mt-1">
                Your password for <strong className="text-slate-800">{targetEmail}</strong> has been changed. You can now sign in with your new credentials.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-3 pb-6 px-6">
              <Button 
                className="w-full bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold h-11 text-base shadow-sm"
                onClick={() => router.push('/signin')}
              >
                Sign In Now
              </Button>
            </CardFooter>
          </>
        ) : (
          /* State 3: Reset Form */
          <>
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#095c7b]" /> Create New Password
              </CardTitle>
              <CardDescription className="text-slate-600 text-xs">
                Resetting password for: <span className="font-semibold text-slate-800">{targetEmail}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password text-xs font-semibold text-slate-700">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password text-xs font-semibold text-slate-700">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Realtime Password Rules Checklist */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#095c7b]" /> Password Requirements
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className={hasMinLength ? 'text-slate-800 font-medium' : 'text-slate-500'}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className={passwordsMatch ? 'text-slate-800 font-medium' : 'text-slate-500'}>Passwords match</span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold h-10 shadow-sm" 
                  disabled={isSubmitting || !hasMinLength || !passwordsMatch}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader /> Updating Password...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="border-t border-slate-100 bg-slate-50/50 py-3.5 flex justify-center text-xs text-slate-500">
              <Link href="/signin" className="inline-flex items-center gap-1 text-[#095c7b] hover:underline font-medium">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FullScreenLoader message="Loading reset password application..." />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
