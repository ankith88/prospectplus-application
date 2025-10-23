

"use client"

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
import Image from 'next/image';
import Link from 'next/link';
import { FullScreenLoader, Loader } from '@/components/ui/loader';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const router = useRouter();
  const { signIn, user, loading: authLoading, isSigningIn, sendPasswordReset } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/leads');
    }
  }, [user, authLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // The redirect is handled by the useEffect in useAuth
    } catch (error: any) {
      console.error("Sign in failed:", error);
      let errorMessage = "An unexpected error occurred. Please check your credentials.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
      } else {
          errorMessage = error.message;
      }
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: errorMessage,
      })
    }
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
        // We show a generic message to avoid confirming if an email exists
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
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={100}
              height={100}
              alt="MailPlus CRM Logo"
              data-ai-hint="logo"
            />
            <CardTitle className="text-2xl mt-4">ProspectPlus</CardTitle>
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
