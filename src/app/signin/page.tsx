

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Image from 'next/image';
import Link from 'next/link';
import { FullScreenLoader } from '@/components/ui/loader';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { signIn, user, loading: authLoading, isSigningIn } = useAuth();
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

  if (authLoading) {
      return <FullScreenLoader message="Loading..." />;
  }

  return (
    <>
    {(isSigningIn) && <FullScreenLoader message="Signing in..." />}
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center text-center">
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={280}
              height={80}
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
                    <Label htmlFor="password">Password</Label>
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
        </CardFooter>
      </Card>
    </div>
    </>
  );
}
