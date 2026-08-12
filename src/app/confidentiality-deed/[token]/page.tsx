'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { CheckCircle2, ShieldCheck, FileText, Lock, PenTool, RefreshCw } from 'lucide-react';

export default function PublicConfidentialityDeedPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospectData, setProspectData] = useState<any>(null);

  // Form State
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerAddress, setSignerAddress] = useState('');

  // Canvas Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadDeed() {
      if (!token) return;
      try {
        const res = await fetch(`/api/confidentiality-deed/sign?token=${token}`);
        const json = await res.json();
        if (json.success && json.prospect) {
          setProspectData(json.prospect);
          setSignerName(json.prospect.fullName || '');
          setSignerEmail(json.prospect.email || '');

          if (json.prospect.confidentialityDeed?.status === 'signed_online') {
            setIsSuccess(true);
          }
        } else {
          setError(json.message || 'Confidentiality Deed token invalid or expired.');
        }
      } catch (err: any) {
        console.error('Failed to load deed:', err);
        setError('Could not load Confidentiality Deed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadDeed();
  }, [token]);

  // Canvas drawing helpers
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
    if (!signerName.trim()) {
      alert('Please enter your full legal name.');
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      alert('Please provide your digital signature in the drawing box.');
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    setSubmitting(true);

    try {
      const res = await fetch('/api/confidentiality-deed/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signerAddress: signerAddress.trim(),
          signatureDataUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to submit signature.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error submitting signature:', err);
      alert(err.message || 'Could not submit signature.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Confidentiality Deed...</p>
      </div>
    );
  }

  if (error || !prospectData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-sm">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-700">Link Expired or Invalid</CardTitle>
            <CardDescription className="text-sm text-slate-600">{error || 'Invalid deed token.'}</CardDescription>
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
            <CardTitle className="text-2xl text-emerald-900 font-bold">Confidentiality Deed Signed</CardTitle>
            <CardDescription className="text-xs text-emerald-700">
              Thank you, {signerName || prospectData.fullName}. Your deed has been successfully recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center text-xs text-slate-600 space-y-4">
            <p>
              Your digital signature and timestamp have been registered with MailPlus Head Office. You are now cleared to participate in a franchise run-along / site observation.
            </p>
            <div className="p-3 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
              Signer: {signerName || prospectData.fullName} ({signerEmail || prospectData.email})
            </div>
            <p className="text-slate-400 text-[11px]">You can close this window now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#095c7b] text-white rounded-xl p-6 shadow-md text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-sky-200 mb-2">
              <Lock className="h-3.5 w-3.5" /> Confidentiality Agreement
            </div>
            <h1 className="text-2xl font-bold">Confidentiality Deed (Mutual)</h1>
            <p className="text-xs text-sky-100 mt-1">MailPlus Pty Ltd & {prospectData.fullName}</p>
          </div>
          <Badge className="bg-amber-400 text-slate-900 font-bold px-3 py-1 text-xs">
            Commercial in Confidence
          </Badge>
        </div>

        {/* Deed Document Terms Box */}
        <Card className="shadow-sm border">
          <CardHeader className="bg-slate-50 border-b pb-3">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#095c7b]" /> Deed Terms & Conditions Summary
            </CardTitle>
            <CardDescription className="text-xs">
              Please review the terms governing the disclosure of MailPlus operational routes, financial run metrics, and customer lists.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 text-xs text-slate-700 space-y-3 max-h-72 overflow-y-auto leading-relaxed border-b bg-white">
            <p className="font-semibold text-slate-900">1. MEANING OF PURPOSE</p>
            <p>
              Each party possesses Confidential Information and wishes to review Confidential Information provided by the other party for the Purpose of evaluating a MailPlus Franchise opportunity and participating in a operational run-along / site evaluation.
            </p>
            <p className="font-semibold text-slate-900">2. MAINTENANCE OF CONFIDENTIALITY</p>
            <p>
              The Recipient must keep confidential and not disclose to any person the Confidential Information of the Discloser, except to employees, professional advisors, or representatives who need to know for the Permitted Purpose.
            </p>
            <p className="font-semibold text-slate-900">3. RESTRICTIONS ON USE</p>
            <p>
              The Recipient must not use the Confidential Information for any purpose other than evaluating the MailPlus franchise business, nor copy, reverse-engineer, or share customer list details with any third party.
            </p>
            <p className="font-semibold text-slate-900">4. GOVERNING LAW</p>
            <p>
              This Deed is governed by the laws of New South Wales, Australia. Each party submits to the non-exclusive jurisdiction of the courts of New South Wales.
            </p>
          </CardContent>
        </Card>

        {/* Digital Signature Form */}
        <Card className="shadow-md border">
          <CardHeader className="bg-slate-50 border-b pb-3">
            <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
              <PenTool className="h-4 w-4" /> Candidate Digital Signature
            </CardTitle>
            <CardDescription className="text-xs">
              Complete your legal details and draw your signature below to execute the deed online.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Legal Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="john.smith@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Residential Address</Label>
                <Input
                  value={signerAddress}
                  onChange={(e) => setSignerAddress(e.target.value)}
                  placeholder="Street address, suburb, state, postcode"
                />
              </div>

              {/* Signature Canvas Box */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    Draw Signature Below <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCanvas}
                    className="h-6 text-[11px] text-slate-500 hover:text-red-600 gap-1"
                  >
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
                <p className="text-[10px] text-slate-400">Use mouse, touch screen, or stylus to draw signature inside the box.</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-[11px] text-slate-700">
                By clicking "Sign & Execute Deed", I confirm that the information provided is accurate and that I agree to be bound by the terms of this Confidentiality Deed.
              </div>

              <Button
                type="submit"
                disabled={submitting || !hasSignature}
                className="w-full bg-[#095c7b] hover:bg-[#074760] text-white py-2.5 font-bold shadow text-sm"
              >
                {submitting ? <Loader className="h-4 w-4 mr-2" /> : null}
                Sign & Execute Deed
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
