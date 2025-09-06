

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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { signInWithLink, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/leads');
    }
  }, [user, authLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithLink(email);
      setEmailSent(true);
    } catch (error: any) {
      console.error("Sign in failed:", error);
      let errorMessage = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
      } else {
          errorMessage = error.message;
      }
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: errorMessage,
      })
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
      return <FullScreenLoader message="Loading..." />;
  }

  return (
    <>
    {loading && <FullScreenLoader message="Sending link..." />}
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center text-center">
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={140}
              height={40}
              alt="MailPlus CRM Logo"
              data-ai-hint="logo"
            />
            <CardTitle className="text-2xl mt-4">ProspectPlus</CardTitle>
            <CardDescription className="text-center">
                {emailSent ? "Check your email for the sign-in link." : "Sign in with a secure link."}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Email Sent!</AlertTitle>
              <AlertDescription>
                A sign-in link has been sent to <strong>{email}</strong>. Please check your inbox (and spam folder) to continue.
              </AlertDescription>
            </Alert>
          ) : (
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
                    disabled={loading}
                />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                Send Sign-in Link
                </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center text-center gap-4 text-sm text-muted-foreground">
           <div>By signing in, you agree to our terms of service.</div>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}
