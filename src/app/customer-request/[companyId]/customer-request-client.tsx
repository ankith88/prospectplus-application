"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { ServiceSelection } from '@/lib/types';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Wrench, 
  UserMinus, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  DollarSign, 
  Clock, 
  Plus, 
  Trash2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Paperclip,
  FileText,
  UploadCloud,
  X
} from 'lucide-react';

interface PublicCompany {
  id: string;
  prospectPlusId?: string;
  companyName: string;
  netsuiteId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  services: ServiceSelection[];
}

interface RequestAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt: string;
}

const CANCELLATION_REASONS = [
  'Price too high / Budget constraints',
  'Competitor offer',
  'Service Quality issues',
  'No longer needed / Business model changed',
  'Business closing / Relocating',
  'Other'
];

export default function CustomerRequestClient({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request mode
  const [requestType, setRequestType] = useState<'change_of_service' | 'cancellation'>('change_of_service');

  // Contact Info
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Change of Service States
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['frequency_change']);
  const [services, setServices] = useState<ServiceSelection[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceFrequency, setNewServiceFrequency] = useState('5 Days / Week');
  const [newServiceRate, setNewServiceRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [serviceChangeNotes, setServiceChangeNotes] = useState('');

  // Cancellation States
  const [cancellationReason, setCancellationReason] = useState(CANCELLATION_REASONS[0]);
  const [cancellationWhy, setCancellationWhy] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [cancellationNotes, setCancellationNotes] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form handling
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompany() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/company/${companyId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Unable to load company details. Please verify your link.');
        }
        const data = await res.json();
        setCompany(data.company);
        setContactName(data.company.contactName || '');
        setContactEmail(data.company.contactEmail || '');
        setContactPhone(data.company.contactPhone || '');
        setServices(JSON.parse(JSON.stringify(data.company.services || [])));
        
        // Set default effective / cancellation date to 14 days out
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 14);
        const isoDate = defaultDate.toISOString().split('T')[0];
        setEffectiveDate(isoDate);
        setCancellationDate(isoDate);
      } catch (err: any) {
        setError(err.message || 'Error loading page');
      } finally {
        setLoading(false);
      }
    }
    loadCompany();
  }, [companyId]);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleUpdateServiceRate = (index: number, newRateStr: string) => {
    const val = parseFloat(newRateStr);
    const updated = [...services];
    updated[index].rate = isNaN(val) ? 0 : val;
    setServices(updated);
  };

  const handleUpdateServiceFrequency = (index: number, freq: any) => {
    const updated = [...services];
    updated[index].frequency = freq;
    setServices(updated);
  };

  const handleRemoveServiceItem = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
    if (!selectedCategories.includes('remove_service')) {
      setSelectedCategories([...selectedCategories, 'remove_service']);
    }
  };

  const handleAddNewService = () => {
    if (!newServiceName.trim()) return;
    const rateVal = parseFloat(newServiceRate);
    const newService: ServiceSelection = {
      id: `custom_${Date.now()}`,
      name: newServiceName.trim(),
      frequency: newServiceFrequency,
      rate: isNaN(rateVal) ? 0 : rateVal,
      quantity: 1,
    };
    setServices([...services, newService]);
    setNewServiceName('');
    setNewServiceRate('');
    if (!selectedCategories.includes('add_service')) {
      setSelectedCategories([...selectedCategories, 'add_service']);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !company) return;
    setUploadingFile(true);
    try {
      const uploadedList = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `cs_requests/${company.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedList.push({
          name: file.name,
          url,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }
      setAttachments(uploadedList);
    } catch (err: any) {
      alert(`Error uploading file: ${err.message}`);
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    if (!contactName.trim() || !contactEmail.trim()) {
      alert('Please fill out your contact name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requestType,
        leadId: company.id,
        netsuiteId: company.netsuiteId,
        companyName: company.companyName,
        contactName,
        contactEmail,
        contactPhone,
        attachments,
        notes: requestType === 'change_of_service' ? serviceChangeNotes : cancellationNotes,
        
        ...(requestType === 'change_of_service' ? {
          serviceChangeCategories: selectedCategories,
          requestedServices: services,
          effectiveDate,
        } : {
          cancellationReason,
          cancellationWhy,
          cancellationDate,
          cancellationTheme: cancellationReason,
        })
      };

      const res = await fetch('/api/cs-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmittedRef(data.requestId || data.cancellationId || 'REQ-' + Date.now().toString().slice(-6));
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Loader />
          <p className="text-sm font-medium text-slate-600">Loading your account details...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-rose-200 shadow-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-rose-900 text-xl">Account Not Found</CardTitle>
            <CardDescription className="text-slate-600">
              {error || 'The requested customer profile could not be found. Please double check your link or contact MailPlus support.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (submittedRef) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <Card className="max-w-lg w-full shadow-lg border-emerald-100 bg-white overflow-hidden">
          <div className="bg-[#095c7b] p-6 text-center text-white">
            <div className="flex justify-center mb-3">
              <Image 
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" 
                alt="MailPlus Logo" 
                width={140} 
                height={40} 
                unoptimized
                className="h-10 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold">Request Submitted</h1>
            <p className="text-cyan-100 text-sm mt-1">Thank you for getting in touch with MailPlus.</p>
          </div>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Reference Number</p>
              <p className="text-2xl font-extrabold text-[#095c7b] tracking-wider mt-1">{submittedRef}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-left border border-slate-200 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Company:</span>
                <span className="font-bold text-slate-900">{company.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Prospect+ ID:</span>
                <span className="font-bold text-slate-900">#{company.prospectPlusId || company.id}</span>
              </div>
              {company.netsuiteId && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">NetSuite ID:</span>
                  <span className="font-bold text-slate-900">#{company.netsuiteId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Request Type:</span>
                <Badge variant={requestType === 'change_of_service' ? 'default' : 'destructive'}>
                  {requestType === 'change_of_service' ? 'Change of Service' : 'Cancellation Request'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Contact:</span>
                <span>{contactName} ({contactEmail})</span>
              </div>
              {attachments.length > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Attachments:</span>
                  <span className="font-bold text-[#095c7b]">{attachments.length} file(s) attached</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600">
              Our Customer Success team has received your request and will review it promptly. We will contact you if any further details are required.
            </p>
          </CardContent>
          <CardFooter className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
            <p className="text-xs text-slate-400">© 2026 MailPlus Australia. All rights reserved.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Brand Banner Header */}
        <div className="bg-[#095c7b] rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
              <Image 
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" 
                alt="MailPlus Logo" 
                width={130} 
                height={38} 
                unoptimized
                className="h-8 w-auto"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Service Portal</h1>
              <p className="text-xs sm:text-sm text-cyan-100">Business logistics, made simple.</p>
            </div>
          </div>

          <div className="sm:text-right sm:border-l sm:border-white/20 sm:pl-6 w-full sm:w-auto">
            <p className="text-xs text-cyan-200 uppercase font-semibold">Account</p>
            <p className="text-lg sm:text-xl font-extrabold text-white leading-tight break-words">{company.companyName}</p>
            <div className="flex flex-wrap items-center sm:justify-end gap-x-2 text-xs text-cyan-100 mt-1">
              <span>Prospect+ ID: <strong className="text-white">#{company.prospectPlusId || company.id}</strong></span>
              {company.netsuiteId && (
                <span>• NetSuite ID: <strong className="text-white">#{company.netsuiteId}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Main Request Form Card */}
        <Card className="shadow-lg border-slate-200 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6">
            <CardTitle className="text-xl text-[#095c7b] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" />
              What would you like to request today?
            </CardTitle>
            <CardDescription className="text-slate-600">
              Select your request type below to update your MailPlus service schedule, rates, or account status.
            </CardDescription>

            {/* Request Type Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-2">
              <button
                type="button"
                onClick={() => setRequestType('change_of_service')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start space-x-3 ${
                  requestType === 'change_of_service'
                    ? 'border-[#095c7b] bg-sky-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2.5 rounded-lg ${requestType === 'change_of_service' ? 'bg-[#095c7b] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Change of Service</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modify service price, frequency, add new service, or remove service.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('cancellation')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start space-x-3 ${
                  requestType === 'cancellation'
                    ? 'border-rose-600 bg-rose-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2.5 rounded-lg ${requestType === 'cancellation' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <UserMinus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cancellation Request</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Request to pause or cancel your current MailPlus services.
                  </p>
                </div>
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">

              {/* ---------------- CHANGE OF SERVICE FORM ---------------- */}
              {requestType === 'change_of_service' && (
                <div className="space-y-6">
                  
                  {/* Category check options */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-800 mb-2 block">
                      Select all change types that apply:
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'price_change', label: 'Price Change' },
                        { id: 'frequency_change', label: 'Frequency Change' },
                        { id: 'add_service', label: 'Add Service' },
                        { id: 'remove_service', label: 'Remove Service' },
                      ].map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className={`cursor-pointer p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                              isSelected
                                ? 'border-[#095c7b] bg-sky-50 text-[#095c7b]'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cat.label}</span>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleCategory(cat.id)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Services List & Adjustments */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-slate-800">
                        Current Services & Requested Updates
                      </Label>
                      <span className="text-xs text-slate-500">Edit values directly below</span>
                    </div>

                    {services.length === 0 ? (
                      <div className="p-4 rounded-lg bg-slate-50 text-center text-slate-500 text-sm">
                        No active services recorded for this account. You can add a new service below.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {services.map((srv, idx) => (
                          <div key={srv.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Badge variant="outline" className="bg-white text-[#095c7b] border-[#095c7b]/30">
                                  #{idx + 1}
                                </Badge>
                                {srv.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveServiceItem(idx)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <Label className="text-xs font-medium text-slate-600 mb-1 block">Frequency</Label>
                                <Select
                                  value={typeof srv.frequency === 'string' ? srv.frequency : '5 Days / Week'}
                                  onValueChange={(val) => handleUpdateServiceFrequency(idx, val)}
                                >
                                  <SelectTrigger className="bg-white h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5 Days / Week">5 Days / Week (Mon - Fri)</SelectItem>
                                    <SelectItem value="3 Days / Week">3 Days / Week (MWF)</SelectItem>
                                    <SelectItem value="2 Days / Week">2 Days / Week (TT)</SelectItem>
                                    <SelectItem value="1 Day / Week">1 Day / Week</SelectItem>
                                    <SelectItem value="Adhoc">Adhoc / On Demand</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs font-medium text-slate-600 mb-1 block">Requested Rate ($ per service)</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={srv.rate || ''}
                                    onChange={(e) => handleUpdateServiceRate(idx, e.target.value)}
                                    className="pl-7 bg-white h-9 text-xs font-semibold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Service Box */}
                  <div className="p-4 rounded-xl border border-dashed border-sky-300 bg-sky-50/40 space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#095c7b] flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Add Another Service
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Input
                          placeholder="Service Name (e.g. Express Satchels)"
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          className="bg-white h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Select value={newServiceFrequency} onValueChange={setNewServiceFrequency}>
                          <SelectTrigger className="bg-white h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5 Days / Week">5 Days / Week</SelectItem>
                            <SelectItem value="3 Days / Week">3 Days / Week</SelectItem>
                            <SelectItem value="2 Days / Week">2 Days / Week</SelectItem>
                            <SelectItem value="1 Day / Week">1 Day / Week</SelectItem>
                            <SelectItem value="Adhoc">Adhoc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Rate ($)"
                          value={newServiceRate}
                          onChange={(e) => setNewServiceRate(e.target.value)}
                          className="bg-white h-9 text-xs"
                        />
                        <Button
                          type="button"
                          onClick={handleAddNewService}
                          size="sm"
                          className="bg-[#095c7b] hover:bg-[#07475f] text-white h-9 px-3 text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Effective Date & Additional Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 mb-1 block">Requested Effective Start Date (Optional)</Label>
                      <Input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1 block">Additional Details & Notes (Optional)</Label>
                    <Textarea
                      placeholder="Please explain any specific requirements, timing preferences, or price change details..."
                      value={serviceChangeNotes}
                      onChange={(e) => setServiceChangeNotes(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                </div>
              )}

              {/* ---------------- CANCELLATION FORM ---------------- */}
              {requestType === 'cancellation' && (
                <div className="space-y-6">
                  
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-sm">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      We are sorry to see you go!
                    </p>
                    <p>
                      Your feedback is invaluable in helping us improve our logistics service. Please provide any details below so our Customer Success team can process your request.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 mb-1 block">Primary Reason for Cancellation (Optional)</Label>
                      <Select value={cancellationReason} onValueChange={setCancellationReason}>
                        <SelectTrigger className="h-10 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CANCELLATION_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 mb-1 block">Requested Stop Date (Optional)</Label>
                      <Input
                        type="date"
                        value={cancellationDate}
                        onChange={(e) => setCancellationDate(e.target.value)}
                        className="h-10 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1 block">Specific Reason / Feedback (Optional)</Label>
                    <Textarea
                      placeholder="Could you tell us more about what prompted this decision? Is there anything MailPlus could do to keep your business?"
                      value={cancellationWhy}
                      onChange={(e) => setCancellationWhy(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1 block">Additional Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any additional notes or comments regarding final pickups or billing..."
                      value={cancellationNotes}
                      onChange={(e) => setCancellationNotes(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                </div>
              )}

              {/* ---------------- FILE ATTACHMENTS SECTION ---------------- */}
              <div className="border-t border-slate-200 pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-[#095c7b]" />
                    Upload Supporting Attachments (Optional)
                  </Label>
                  <span className="text-xs text-slate-400">PDF, Images, Word, Excel, etc.</span>
                </div>

                {/* Upload Trigger Area */}
                <div className="relative border-2 border-dashed border-slate-200 hover:border-[#095c7b] bg-slate-50 hover:bg-sky-50/50 rounded-xl p-4 text-center transition-all">
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileUpload} 
                    disabled={uploadingFile}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    {uploadingFile ? (
                      <div className="flex items-center space-x-2 text-xs font-semibold text-[#095c7b]">
                        <Loader /> Uploading attachment...
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-[#095c7b] mb-1" />
                        <p className="text-xs font-bold text-slate-700">Click or drag files here to attach</p>
                        <p className="text-[11px] text-slate-400">Rate sheets, cancellation letters, or supporting documents</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Attached Files List */}
                {attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-semibold text-slate-600 block">Attached Files ({attachments.length}):</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="w-4 h-4 text-[#095c7b] shrink-0" />
                            <span className="font-semibold text-slate-800 truncate" title={att.name}>{att.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------- CONTACT VERIFICATION SECTION ---------------- */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#095c7b]" />
                  Your Contact Information
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Your Name</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Full Name"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Email Address</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Phone Number</Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="0400 000 000"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

            </CardContent>

            <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Submitting will log your request with MailPlus Customer Success.
              </p>
              <Button
                type="submit"
                disabled={submitting || uploadingFile}
                className={`w-full sm:w-auto h-11 px-8 font-bold text-white shadow-md ${
                  requestType === 'change_of_service' 
                    ? 'bg-[#095c7b] hover:bg-[#07475f]' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit Request <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  );
}
