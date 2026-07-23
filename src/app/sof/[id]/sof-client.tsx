'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Lead } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, FileText, Trash2, ShieldCheck, Mail, MapPin, Inbox } from 'lucide-react';

interface SofClientProps {
  token: string;
  lead: Lead;
  isValidSof: boolean;
  invalidReason: string;
}

export default function SofClient({ token, lead, isValidSof, invalidReason }: SofClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [position, setPosition] = useState(lead.sofDetails?.position ?? '');
  const [date, setDate] = useState(lead.sofDetails?.date ?? new Date().toLocaleDateString('en-AU'));
  const [hasSigned, setHasSigned] = useState(!!lead.sofDetails?.signatureDataUrl);
  const [signatureUrl, setSignatureUrl] = useState(lead.sofDetails?.signatureDataUrl ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Canvas drawing context setup
  useEffect(() => {
    if (isValidSof && !hasSigned && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [isValidSof, hasSigned]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.clientX - rect.left;
      y = e.nativeEvent.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.clientX - rect.left;
      y = e.nativeEvent.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureUrl('');
    setHasSigned(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let finalSigUrl = signatureUrl;

    if (!hasSigned) {
      const canvas = canvasRef.current;
      if (!canvas) {
        setErrorMsg('Signature canvas is missing.');
        return;
      }

      // Check if blank
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      if (canvas.toDataURL() === blank.toDataURL()) {
        setErrorMsg('Please sign the signature box before submitting.');
        return;
      }

      finalSigUrl = canvas.toDataURL();
    }

    if (!position.trim()) {
      setErrorMsg('Please enter your Position / Title (e.g. Director, Manager).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sof/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          leadId: lead.id,
          signatureDataUrl: finalSigUrl,
          position: position.trim(),
          date,
          signedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit Standing Order Form');
      }

      setSignatureUrl(finalSigUrl);
      setHasSigned(true);
      setSuccessMsg('Standing Order Form (R9B) signed and authorized successfully!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error submitting signature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Address helper strings
  const streetAddr = [lead.address?.street || lead.address?.address1, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ');
  const postalAddr = [lead.postalAddress?.street || lead.postalAddress?.address1, lead.postalAddress?.city, lead.postalAddress?.state, lead.postalAddress?.zip].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-8 px-4 font-sans">
      {/* Header Banner */}
      <header className="w-full max-w-3xl bg-[#095c7b] text-white rounded-t-xl p-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/20">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Australia Post Standing Order Form</h1>
            <p className="text-xs text-slate-200 mt-0.5">Authorization for Signature on Delivery Mail (R9B)</p>
          </div>
        </div>
        <Badge variant="outline" className="border-white/30 text-white bg-white/10 px-3 py-1 text-xs">
          MailPlus Official
        </Badge>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 shadow-lg p-6 space-y-6">
        {!isValidSof ? (
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Standing Order Form Unavailable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {invalidReason}
              </p>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-md border text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Requirements for Standing Order Form (R9B):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Active MailPlus AMPO Service (Pickup from PO Box)</li>
                  <li>Registered PO Box / Postal Address</li>
                </ul>
                <p className="pt-2 text-muted-foreground">
                  If you believe this is an error or need assistance, please contact MailPlus Customer Support or your Account Manager.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Lead & Address Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-5 border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{lead.companyName || 'Valued Customer'}</h2>
                  {lead.prospectPlusId && (
                    <p className="text-xs text-slate-500">ID: {lead.prospectPlusId}</p>
                  )}
                </div>
                {hasSigned && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 self-start sm:self-auto py-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed &amp; Authorized
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#095c7b]" /> Premises Address
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-5">{streetAddr || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <Inbox className="w-3.5 h-3.5 text-[#095c7b]" /> Postal / PO Box Address
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-5">{postalAddr || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Form Description */}
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-l-4 border-[#095c7b] pl-3 py-1">
              <strong className="text-slate-800 dark:text-slate-200">Standing Order Authorization:</strong> By signing below, you authorize Australia Post to deliver Signature on Delivery mail (R9B) directly to MailPlus representatives for delivery to your designated address.
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Signature & Position Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="position-input" className="text-xs font-semibold">
                    Authorized Signatory Position / Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="position-input"
                    type="text"
                    placeholder="e.g. Director, Operations Manager, Owner"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={hasSigned || isSubmitting}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-input" className="text-xs font-semibold">Date</Label>
                  <Input
                    id="date-input"
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={hasSigned || isSubmitting}
                    className="text-sm bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Signature Pad or Saved Signature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Digital Signature <span className="text-red-500">*</span>
                  </Label>
                  {!hasSigned && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      className="h-7 text-xs text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                    </Button>
                  )}
                </div>

                {hasSigned && signatureUrl ? (
                  <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center space-y-2">
                    {/* eslint-disable-next-html-loader */}
                    <img src={signatureUrl} alt="Saved Digital Signature" className="max-h-32 object-contain border bg-white rounded p-2" />
                    <p className="text-xs text-slate-500">Authorized by {position} on {date}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHasSigned(false)}
                      className="mt-2 text-xs"
                    >
                      Re-sign Standing Order Form
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-1 bg-white">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={180}
                      className="w-full h-44 cursor-crosshair touch-none bg-white rounded"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="text-[11px] text-center text-slate-400 py-1 bg-slate-50 border-t">
                      Draw your signature inside the box using mouse or touch
                    </div>
                  </div>
                )}
              </div>

              {!hasSigned && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-semibold py-6 text-base shadow-md rounded-lg transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 animate-pulse" /> Submitting Signature...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> Submit &amp; Authorize Standing Order Form
                    </span>
                  )}
                </Button>
              )}
            </form>
          </>
        )}
      </div>

      <footer className="mt-8 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} MailPlus Australia. All rights reserved.
      </footer>
    </div>
  );
}
