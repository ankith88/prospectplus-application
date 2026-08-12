'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { CheckCircle2, FileText, DollarSign, PenTool, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react';

export default function PublicEOIPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospectData, setProspectData] = useState<any>(null);

  // EOI Form States
  const [entityStructure, setEntityStructure] = useState<'SOLE TRADER' | 'PARTNERSHIP' | 'PTY LTD COMPANY' | 'LTD COMPANY'>('SOLE TRADER');
  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phoneHome, setPhoneHome] = useState('');
  const [phoneBusiness, setPhoneBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [driversLicence, setDriversLicence] = useState('');
  const [driversLicencePlaceOfIssue, setDriversLicencePlaceOfIssue] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [ownershipPercent, setOwnershipPercent] = useState('100');

  // Questionnaires
  const [reasonForPurchase, setReasonForPurchase] = useState('');
  const [fundingSource, setFundingSource] = useState('');
  const [whySuited, setWhySuited] = useState('');
  const [fullTimeDevotion, setFullTimeDevotion] = useState(true);
  const [requiresFinance, setRequiresFinance] = useState(false);

  // References
  const [ref1Name, setRef1Name] = useState('');
  const [ref1Phone, setRef1Phone] = useState('');
  const [ref1Company, setRef1Company] = useState('');

  // Assets & Liabilities
  const [totalAssets, setTotalAssets] = useState('');
  const [totalLiabilities, setTotalLiabilities] = useState('');

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadEOI() {
      if (!token) return;
      try {
        const res = await fetch(`/api/eoi/sign?token=${token}`);
        const json = await res.json();
        if (json.success && json.prospect) {
          setProspectData(json.prospect);
          setEmail(json.prospect.email || '');
          setPhoneBusiness(json.prospect.phone || '');

          if (json.prospect.eoiData?.status === 'signed_online') {
            setIsSuccess(true);
          }
        } else {
          setError(json.message || 'EOI token invalid or expired.');
        }
      } catch (err: any) {
        console.error('Failed to load EOI:', err);
        setError('Could not load Expression of Interest form.');
      } finally {
        setLoading(false);
      }
    }
    loadEOI();
  }, [token]);

  // Drawing canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#095c7b';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature || !canvasRef.current) {
      alert('Please provide your digital signature before submitting.');
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    setSubmitting(true);

    try {
      const formData = {
        entityStructure,
        companyName: companyName.trim(),
        abn: abn.trim(),
        registeredAddress: registeredAddress.trim(),
        businessAddress: businessAddress.trim(),
        phoneHome: phoneHome.trim(),
        phoneBusiness: phoneBusiness.trim(),
        driversLicence: driversLicence.trim(),
        driversLicencePlaceOfIssue: driversLicencePlaceOfIssue.trim(),
        dateOfBirth,
        maritalStatus,
        spouseName: spouseName.trim(),
        ownershipPercent,
        reasonForPurchase: reasonForPurchase.trim(),
        fundingSource: fundingSource.trim(),
        whySuited: whySuited.trim(),
        fullTimeDevotion,
        requiresFinance,
        references: ref1Name ? [{ name: ref1Name, phone: ref1Phone, company: ref1Company, position: '', nature: 'Trade' }] : [],
        totalAssets,
        totalLiabilities,
        netWorth: (Number(totalAssets) || 0) - (Number(totalLiabilities) || 0),
        declarationConfirmed: true,
      };

      const res = await fetch('/api/eoi/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerName: prospectData.fullName,
          signerEmail: email,
          signatureDataUrl,
          formData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to submit EOI form.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error submitting EOI:', err);
      alert(err.message || 'Failed to submit EOI form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Expression of Interest Form...</p>
      </div>
    );
  }

  if (error || !prospectData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-sm">
          <CardHeader className="text-center pb-2">
            <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-700">Link Invalid or Expired</CardTitle>
            <CardDescription className="text-sm text-slate-600">{error || 'Invalid EOI link.'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-emerald-300 shadow-md">
          <CardHeader className="text-center pb-3 bg-emerald-50 border-b rounded-t-xl">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
            <CardTitle className="text-2xl text-emerald-900 font-bold">EOI Form Submitted & Signed</CardTitle>
            <CardDescription className="text-xs text-emerald-700">
              Thank you, {prospectData.fullName}. Your Expression of Interest has been recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center text-xs text-slate-600 space-y-4">
            <p>
              Your application details and digital signature have been received by MailPlus Head Office. Our finance and sales team will contact you shortly to confirm your deposit and next steps.
            </p>
            <div className="p-3 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
              Applicant: {prospectData.fullName} ({email})
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#095c7b] text-white rounded-xl p-6 sm:p-8 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="bg-white/10 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Official Application Form
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-2">Expression of Interest Form (EOI)</h1>
              <p className="text-sky-100 text-xs mt-1">MailPlus Franchise Opportunity</p>
            </div>
            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus" className="h-9 hidden sm:block" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Entity Structure & Details */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <UserCheck className="h-4 w-4" /> 1. Applicant Structure & Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Current / Proposed Entity Structure <span className="text-red-500">*</span></Label>
                <Select value={entityStructure} onValueChange={(val: any) => setEntityStructure(val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLE TRADER">Sole Trader</SelectItem>
                    <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                    <SelectItem value="PTY LTD COMPANY">Pty Ltd Company</SelectItem>
                    <SelectItem value="LTD COMPANY">Ltd Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Applicant / Company Name <span className="text-red-500">*</span></Label>
                  <Input required value={companyName || prospectData.fullName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ABN (Australian Business Number)</Label>
                  <Input value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="e.g. 12 345 678 901" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business Address</Label>
                  <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Street, suburb, state, postcode" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Registered Address</Label>
                  <Input value={registeredAddress} onChange={(e) => setRegisteredAddress(e.target.value)} placeholder="Registered office address" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Driver's License Number</Label>
                  <Input value={driversLicence} onChange={(e) => setDriversLicence(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">State of Issue</Label>
                  <Input value={driversLicencePlaceOfIssue} onChange={(e) => setDriversLicencePlaceOfIssue(e.target.value)} placeholder="e.g. NSW" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Questionnaire & Intent */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <FileText className="h-4 w-4" /> 2. General Evaluation Questionnaire
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Why do you want to buy a MailPlus Franchise?</Label>
                <textarea
                  rows={3}
                  value={reasonForPurchase}
                  onChange={(e) => setReasonForPurchase(e.target.value)}
                  className="w-full p-2.5 text-xs border rounded-md focus:ring-2 focus:ring-[#095c7b]"
                  placeholder="What features of this franchise attracted you?"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">How do you intend to fund the purchase?</Label>
                <textarea
                  rows={2}
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value)}
                  className="w-full p-2.5 text-xs border rounded-md focus:ring-2 focus:ring-[#095c7b]"
                  placeholder="e.g. Savings, equity, bank finance..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Will you devote full time to the business?</Label>
                  <Select value={fullTimeDevotion ? 'Yes' : 'No'} onValueChange={(val) => setFullTimeDevotion(val === 'Yes')}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes - Full Time</SelectItem>
                      <SelectItem value="No">No - Part Time / Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Require finance assistance from banking partners?</Label>
                  <Select value={requiresFinance ? 'Yes' : 'No'} onValueChange={(val) => setRequiresFinance(val === 'Yes')}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes - Require Finance</SelectItem>
                      <SelectItem value="No">No - Self Funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Deposit Agreement */}
          <Card className="shadow-sm border border-amber-300 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-700" /> 3. 5% Deposit Terms & Trust Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-amber-950 space-y-3">
              <p>
                A deposit of 5% ("Deposit") must accompany this application to reserve your territory during the review process.
              </p>
              <div className="bg-white p-3 border border-amber-200 rounded-md font-mono text-[11px] space-y-1 text-slate-800">
                <div>Financial Institution: <strong>NAB</strong></div>
                <div>Account Name: <strong>Mail Plus Pty Ltd</strong></div>
                <div>BSB: <strong>082-057</strong> | Account Number: <strong>929905271</strong></div>
                <div>Transaction Description: <strong>"FR DEP '{prospectData.lastName || 'SURNAME'}'"</strong></div>
              </div>
              <p className="text-[11px] text-amber-800">
                The full amount of the Deposit will be refunded should your application be declined. If accepted, it applies towards franchise documentation preparation.
              </p>
            </CardContent>
          </Card>

          {/* Section 4: Digital Signature */}
          <Card className="shadow-md border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <PenTool className="h-4 w-4" /> 4. Digital Signature & Declaration
              </CardTitle>
              <CardDescription className="text-xs">
                By signing below, you declare that all details provided in this Expression of Interest are true and accurate.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">
                  Draw Signature Below <span className="text-red-500">*</span>
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="h-6 text-[11px] text-slate-500 gap-1">
                  <RefreshCw className="h-3 w-3" /> Clear
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-slate-50 touch-none">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full bg-white rounded cursor-crosshair"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !hasSignature}
                className="w-full bg-[#095c7b] hover:bg-[#074760] text-white py-3 font-bold text-sm shadow"
              >
                {submitting ? <Loader className="h-4 w-4 mr-2" /> : null}
                Submit & Sign Expression of Interest
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
