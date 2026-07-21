'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from '@/components/ui/loader';
import { CheckCircle2, AlertCircle, Building, Users, UserPlus, Phone, Mail, ArrowRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  accessToLocalMile?: string;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export default function PublicLocalMileRegistrationPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Lead info
  const [companyName, setCompanyName] = useState('');
  const [prospectPlusId, setProspectPlusId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerServiceEmail, setCustomerServiceEmail] = useState('');
  const [address, setAddress] = useState<Address>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accountManager, setAccountManager] = useState<{ name: string; email: string; phone: string } | null>(null);

  // Selection state
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('existing');

  // New contact form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [authLink, setAuthLink] = useState('');
  const [securityCode, setSecurityCode] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        const res = await fetch(`/api/localmile-registration/${token}`, { cache: 'no-store' });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load registration details.');
        }

        setCompanyName(data.companyName);
        setProspectPlusId(data.prospectPlusId);
        setCustomerPhone(data.customerPhone);
        setCustomerServiceEmail(data.customerServiceEmail);
        setAddress(data.address || {});
        setContacts(data.contacts || []);
        setAccountManager(data.accountManager || null);

        // Pre-select primary contact if available and does not have access
        const primary = data.contacts?.find((c: Contact) => c.isPrimary && c.accessToLocalMile !== 'yes');
        const firstAvailable = data.contacts?.find((c: Contact) => c.accessToLocalMile !== 'yes');
        if (primary) {
          setSelectedContactId(primary.id);
        } else if (firstAvailable) {
          setSelectedContactId(firstAvailable.id);
        } else {
          setContactMode('new');
        }

      } catch (err: any) {
        setError(err.message || 'An error occurred while loading the link.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleRegister = async () => {
    if (!companyName.trim()) {
      toast.error('Company Name is required.');
      return;
    }

    if (contactMode === 'existing' && !selectedContactId) {
      toast.error('Please select an existing contact or create a new one.');
      return;
    }

    if (contactMode === 'existing' && selectedContactId) {
      const selectedContact = contacts.find(c => c.id === selectedContactId);
      if (selectedContact?.accessToLocalMile === 'yes') {
        toast.error('This contact already has access to LocalMile.');
        return;
      }
    }

    if (contactMode === 'new') {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error('Please enter both First Name and Last Name.');
        return;
      }
      if (!email.trim() || !validateEmail(email)) {
        toast.error('Please enter a valid email address.');
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      const existingWithAccess = contacts.find(c => c.email.toLowerCase() === normalizedEmail && c.accessToLocalMile === 'yes');
      if (existingWithAccess) {
        toast.error('A contact with this email already has access to LocalMile.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/localmile-registration/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactId: contactMode === 'existing' ? selectedContactId : null,
          newContact: contactMode === 'new' ? {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            isPrimary
          } : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit registration.');
      }

      setAuthLink(data.localMilePlusAuthLink);
      setSecurityCode(data.securityCode);
      setIsSuccess(true);
      toast.success('Registration successful!');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAddress = (addr: Address) => {
    const parts = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean);
    return parts.join(', ') || 'No address provided';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 gap-4">
        <Loader />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading registration details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-xl border-destructive/20 rounded-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Registration Link Unavailable</CardTitle>
            <CardDescription className="text-slate-500 text-sm mt-1">{error}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-6 text-center">
            <p className="text-xs text-slate-400">
              Please request a new registration link from your BDR or Account Manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
        <Card className="max-w-xl w-full shadow-2xl border-emerald-100 rounded-3xl overflow-hidden">
          <div className="bg-[#095c7b] p-8 text-center text-white">
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold">LocalMile Registration Complete</h2>
            <p className="text-sky-100/90 text-sm mt-2">
              Your free trial has been activated successfully!
            </p>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#095c7b]" /> Account Authentication Details
              </h3>
              <p className="text-sm text-slate-600">
                To access the LocalMile portal, please use the secure link and security code below. We have also sent these details to your email and mobile.
              </p>
              
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Your Portal Authentication Link</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={authLink} className="bg-white border-slate-200 text-xs font-mono" />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        navigator.clipboard.writeText(authLink);
                        toast.success('Authentication Link copied!');
                      }}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Security Access Code</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={securityCode} className="bg-white border-slate-200 text-lg font-bold tracking-widest text-[#095c7b]" />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        navigator.clipboard.writeText(securityCode);
                        toast.success('Security Code copied!');
                      }}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button 
                onClick={() => window.open(authLink, '_blank')}
                className="bg-[#095c7b] hover:bg-[#053647] text-white px-6 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 mx-auto"
              >
                Access LocalMile Portal <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-[#095c7b] py-6 px-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img 
            src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" 
            alt="MailPlus Logo" 
            className="h-10 w-auto" 
          />
          <span className="text-white/80 text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
            Free Trial Registration
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left/Main Column: Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg border-slate-100 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-[#095c7b]" /> Company Details
              </CardTitle>
              <CardDescription className="text-xs">
                Confirm your company details below. You can update your Company Name if it is incorrect.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="companyName" className="text-xs font-semibold text-slate-500">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  className="mt-1 border-slate-200 focus:border-[#095c7b] focus:ring-1 focus:ring-[#095c7b] rounded-lg"
                  placeholder="Enter Company Name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-400">Prospect+ ID</Label>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{prospectPlusId || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400">Business Address</Label>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{formatAddress(address)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-100 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#095c7b]" /> Contact Information
              </CardTitle>
              <CardDescription className="text-xs">
                Select an existing contact or enter new details to associate with this trial registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <RadioGroup 
                value={contactMode} 
                onValueChange={(val: 'existing' | 'new') => setContactMode(val)}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="existing" id="mode-existing" className="peer sr-only" disabled={contacts.length === 0} />
                  <Label
                    htmlFor="mode-existing"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-slate-50 peer-data-[state=checked]:border-[#095c7b] [&:has([data-state=checked])]:border-[#095c7b] cursor-pointer text-center ${
                      contactMode === 'existing' ? 'border-[#095c7b] bg-slate-50/50' : 'border-slate-150'
                    } ${contacts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Users className="mb-2 h-6 w-6 text-slate-500" />
                    <span className="font-semibold text-xs text-slate-800">Existing Contacts</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="new" id="mode-new" className="peer sr-only" />
                  <Label
                    htmlFor="mode-new"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-slate-50 peer-data-[state=checked]:border-[#095c7b] [&:has([data-state=checked])]:border-[#095c7b] cursor-pointer text-center ${
                      contactMode === 'new' ? 'border-[#095c7b] bg-slate-50/50' : 'border-slate-150'
                    }`}
                  >
                    <UserPlus className="mb-2 h-6 w-6 text-slate-500" />
                    <span className="font-semibold text-xs text-slate-800">Add New Contact</span>
                  </Label>
                </div>
              </RadioGroup>

              {contactMode === 'existing' && contacts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold text-slate-500">Choose Contact</Label>
                  <RadioGroup value={selectedContactId} onValueChange={setSelectedContactId} className="space-y-2">
                    {contacts.map((c) => {
                      const hasAccess = c.accessToLocalMile === 'yes';
                      return (
                        <div 
                          key={c.id}
                          className={`flex items-center space-x-3 p-3.5 rounded-xl border transition-all ${
                            hasAccess 
                              ? 'border-slate-100 bg-slate-50/50 opacity-60' 
                              : selectedContactId === c.id 
                                ? 'border-[#095c7b] bg-sky-50/30' 
                                : 'border-slate-200 bg-white'
                          }`}
                        >
                          <RadioGroupItem value={c.id} id={`contact-${c.id}`} disabled={hasAccess} />
                          <Label htmlFor={`contact-${c.id}`} className={`flex-1 ${hasAccess ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <p className="text-sm font-semibold text-slate-800">
                              {c.name} 
                              {c.isPrimary && <span className="text-[10px] bg-[#095c7b]/10 text-[#095c7b] px-2 py-0.5 rounded-full font-bold ml-1 font-sans">Primary</span>}
                              {hasAccess && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold ml-1.5 font-sans">Registered</span>}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.email} {c.phone && `• ${c.phone}`}</p>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {contactMode === 'new' && (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5"><UserPlus className="w-4 h-4" /> New Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-xs font-semibold text-slate-500">First Name *</Label>
                      <Input 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        className="mt-1 border-slate-200 focus:border-[#095c7b]" 
                        placeholder="E.g. John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-xs font-semibold text-slate-500">Last Name *</Label>
                      <Input 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        className="mt-1 border-slate-200 focus:border-[#095c7b]" 
                        placeholder="E.g. Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-500">Email Address *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="mt-1 border-slate-200 focus:border-[#095c7b]" 
                      placeholder="john.doe@company.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-500">Phone Number (Mobile preferred)</Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      className="mt-1 border-slate-200 focus:border-[#095c7b]" 
                      placeholder="E.g. 0412 345 678"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="isPrimary" 
                      checked={isPrimary} 
                      onCheckedChange={(checked) => setIsPrimary(!!checked)} 
                    />
                    <Label htmlFor="isPrimary" className="text-xs font-medium text-slate-600 cursor-pointer">
                      Set as Primary Contact for this company
                    </Label>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button 
                  onClick={handleRegister} 
                  disabled={submitting}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white px-8 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    <>
                      Register & Start Free Trial <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Support & Info Panel */}
        <div className="space-y-6">
          <Card className="shadow-lg border-slate-100 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-sky-50/50 border-b border-sky-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-sky-600" /> Free Trial Features
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                By registering for the LocalMile free trial, your company will receive:
              </p>
              <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-4 leading-relaxed">
                <li><strong>Cost: $0 Free Trial</strong> - Completely free to try the full service.</li>
                <li><strong>5 Free Parcel Collections</strong> - Lodged directly at the Post Office.</li>
                <li><strong>No credit card required</strong>, no obligation, and no contract.</li>
                <li><strong>Skip the Post Office run</strong> - Your local owner-operator collects directly from your premises.</li>
                <li><strong>Flexible booking</strong> - Manage your pickups online via the LocalMile portal (same-day pickup cut-off is 12pm).</li>
              </ul>
              <div className="pt-2 border-t border-slate-100">
                <a 
                  href="https://mailplus.com.au/5-free-collections" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-[#095c7b] hover:underline font-semibold flex items-center gap-1"
                >
                  Learn more about the 5 Free Collections offer &rarr;
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-100 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-500" /> Need Assistance?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                If you have questions about the trial terms, please contact your Account Manager:
              </p>
              <div className="space-y-2 pt-1.5">
                {accountManager ? (
                  <>
                    <div className="text-xs font-bold text-slate-800 mb-1">
                      {accountManager.name}
                    </div>
                    {accountManager.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Mail className="w-4 h-4 text-[#095c7b]" />
                        <a href={`mailto:${accountManager.email}`} className="hover:underline font-semibold">{accountManager.email}</a>
                      </div>
                    )}
                    {accountManager.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Phone className="w-4 h-4 text-[#095c7b]" />
                        <a href={`tel:${accountManager.phone.replace(/\s+/g, '')}`} className="hover:underline font-semibold">{accountManager.phone}</a>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-slate-800 mb-1">MailPlus Support</div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Mail className="w-4 h-4 text-[#095c7b]" />
                      <a href="mailto:support@mailplus.com.au" className="hover:underline font-semibold">support@mailplus.com.au</a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Phone className="w-4 h-4 text-[#095c7b]" />
                      <a href="tel:1300656595" className="hover:underline font-semibold">1300 65 65 95</a>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-6 text-center text-xs border-t border-slate-700">
        <p>&copy; {new Date().getFullYear()} MailPlus. All rights reserved.</p>
        <p className="mt-1 text-slate-500">Business logistics, made simple.</p>
      </footer>
    </div>
  );
}

// Small loader helper specifically for button
function Loader2({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function HelpCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
