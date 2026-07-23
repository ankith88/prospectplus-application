'use client';

import React, { useState } from 'react';
import type { Lead, Contact, Address, Note } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  User,
  Briefcase,
  AlertCircle,
  Hash,
  Send,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LpoOpportunityClientProps {
  token: string;
  initialLead: Lead;
}

export default function LpoOpportunityClient({ token, initialLead }: LpoOpportunityClientProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [status, setStatus] = useState<string>(initialLead.status || initialLead.customerStatus || 'LPO Opportunity');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  // Dialog states
  const [activeDialog, setActiveDialog] = useState<'lost' | 'convert' | null>(null);
  const [userNote, setUserNote] = useState<string>('');
  const [newPublicNote, setNewPublicNote] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExecuteAction = async (actionType: 'lost' | 'convert') => {
    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/lpo-opportunity/${encodeURIComponent(token)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, note: userNote }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update opportunity status.');
      }

      setStatus(data.newStatus);
      setLead(prev => ({
        ...prev,
        status: data.newStatus,
        customerStatus: data.newStatus,
        notes: Array.isArray(prev.notes)
          ? [
              {
                id: `note-${Date.now()}`,
                date: new Date().toISOString(),
                author: 'Public LPO Opportunity Portal',
                content: `Status updated to ${data.newStatus}.${userNote ? ` Note: ${userNote}` : ''}`,
              },
              ...prev.notes,
            ]
          : prev.notes,
      }));

      setNotification({
        type: 'success',
        message: `Opportunity status has been successfully updated to ${data.newStatus}.`,
      });

      setActiveDialog(null);
      setUserNote('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'An error occurred while updating the status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPublicNote = async () => {
    if (!newPublicNote.trim()) return;
    setIsSubmittingNote(true);

    try {
      const nowISO = new Date().toISOString();
      const noteObj: Note = {
        id: `note-${Date.now()}`,
        date: nowISO,
        author: 'Public Visitor',
        content: newPublicNote.trim(),
      };

      setLead(prev => ({
        ...prev,
        notes: Array.isArray(prev.notes) ? [noteObj, ...prev.notes] : [noteObj],
      }));

      setNewPublicNote('');
      setNotification({
        type: 'success',
        message: 'Note added successfully.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Failed to add note.',
      });
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Contacts normalization
  const l = lead as any;
  const contactsList: Contact[] = Array.isArray(lead.contacts) && lead.contacts.length > 0
    ? lead.contacts
    : [
        {
          id: 'primary-contact',
          name: l.contactName || l.personSpokenWithName || l.decisionMakerName || 'Primary Contact',
          title: l.contactTitle || l.personSpokenWithTitle || l.decisionMakerTitle || 'Key Contact',
          email: l.email || l.personSpokenWithEmail || l.decisionMakerEmail || '',
          phone: l.phone || l.mobile || l.personSpokenWithPhone || l.decisionMakerPhone || '',
          isPrimary: true,
        },
      ].filter(c => c.name || c.email || c.phone);

  // Address normalization
  const primaryAddress: Address | null = lead.address || (l.street ? {
    street: l.street || '',
    address1: l.address1 || '',
    city: l.city || '',
    state: l.state || '',
    zip: l.zip || l.postcode || '',
    country: l.country || 'Australia',
  } : null);

  const postalAddress: Address | null = l.postalAddress || null;
  const taggedAddresses = Array.isArray(l.taggedAddresses) ? l.taggedAddresses : [];

  // Notes extraction
  const rawNotesList: any[] = Array.isArray(lead.notes) ? lead.notes : [];
  const noteContentString = typeof lead.notes === 'string' ? lead.notes : '';

  return (
    <div className="min-h-screen bg-[#f4f7f8] flex flex-col font-sans text-slate-800 antialiased">
      {/* Brand Header */}
      <header className="bg-[#095c7b] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
              <img
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
                alt="MailPlus Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>LPO Opportunity Details</span>
              </h1>
              <p className="text-xs text-cyan-100 font-medium mt-0.5">
                Prospect+ Partner Services Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-cyan-100 hidden sm:inline">Current Status:</span>
            <Badge
              className={`px-3 py-1 text-xs font-bold shadow-sm rounded-full ${
                status === 'Won'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : status === 'Lost'
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-sky-500 text-white hover:bg-sky-600'
              }`}
            >
              {status}
            </Badge>
          </div>
        </div>
      </header>

      {/* Action Header / Hero Section */}
      <section className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {lead.companyName || (lead as any).tradingName || 'Company Opportunity'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500">
                <span className="font-semibold text-[#095c7b] bg-[#095c7b]/10 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  Prospect+ ID: {lead.prospectPlusId || 'N/A'}
                </span>
                {((lead as any).businessType || (lead as any).industry) && (
                  <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    {(lead as any).businessType || (lead as any).industry}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setActiveDialog('lost')}
                disabled={actionLoading || status === 'Lost'}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-bold shadow-sm rounded-xl px-5 flex items-center gap-2 transition-all"
              >
                <XCircle className="h-5 w-5 text-rose-600" />
                <span>Lost</span>
              </Button>

              <Button
                size="lg"
                onClick={() => setActiveDialog('convert')}
                disabled={actionLoading || status === 'Won'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md rounded-xl px-6 flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Convert</span>
              </Button>
            </div>
          </div>

          {/* Feedback Banner */}
          {notification && (
            <div
              className={`mt-4 p-4 rounded-xl border flex items-center justify-between text-sm font-medium ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-xs underline hover:no-underline ml-4"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        
        {/* Section 1: Company Details */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#095c7b]" />
              Company Details
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Verified business profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Company Name
                </label>
                <div className="text-base font-semibold text-slate-800">
                  {lead.companyName || 'N/A'}
                </div>
              </div>

              {(lead as any).tradingName && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Trading Name
                  </label>
                  <div className="text-base font-medium text-slate-700">
                    {(lead as any).tradingName}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Prospect+ ID
                </label>
                <div className="text-sm font-semibold text-[#095c7b] bg-[#095c7b]/5 px-2.5 py-1 rounded-md inline-block">
                  {lead.prospectPlusId || 'N/A'}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  ABN / ACN
                </label>
                <div className="text-sm font-medium text-slate-700 font-mono">
                  {lead.abn || (lead as any).acn || 'Not specified'}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Business / Industry Type
                </label>
                <div className="text-sm font-medium text-slate-700">
                  {(lead as any).businessType || (lead as any).industry || 'General Business'}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Opportunity Status
                </label>
                <div>
                  <Badge variant="outline" className="font-semibold border-slate-300 text-slate-700">
                    {status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Address Sections */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#095c7b]" />
              Address Details
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Site location and postal address information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Site Address */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#095c7b] uppercase tracking-wider">
                  <MapPin className="h-4 w-4 text-[#095c7b]" />
                  Site / Primary Address
                </div>
                {primaryAddress ? (
                  <div className="text-sm text-slate-700 space-y-0.5 leading-relaxed font-medium">
                    {primaryAddress.address1 && <div>{primaryAddress.address1}</div>}
                    <div>{primaryAddress.street || 'Street address not available'}</div>
                    <div>
                      {[primaryAddress.city, primaryAddress.state, primaryAddress.zip]
                        .filter(Boolean)
                        .join(' ')}
                    </div>
                    {primaryAddress.country && (
                      <div className="text-xs text-slate-400">{primaryAddress.country}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic">No primary site address recorded.</div>
                )}
              </div>

              {/* Postal Address */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#095c7b] uppercase tracking-wider">
                  <Mail className="h-4 w-4 text-[#095c7b]" />
                  Postal Address
                </div>
                {postalAddress ? (
                  <div className="text-sm text-slate-700 space-y-0.5 leading-relaxed font-medium">
                    {postalAddress.address1 && <div>{postalAddress.address1}</div>}
                    <div>{postalAddress.street || 'Postal street not available'}</div>
                    <div>
                      {[postalAddress.city, postalAddress.state, postalAddress.zip]
                        .filter(Boolean)
                        .join(' ')}
                    </div>
                    {postalAddress.country && (
                      <div className="text-xs text-slate-400">{postalAddress.country}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">
                    Same as Site Address or not separately specified.
                  </div>
                )}
              </div>
            </div>

            {/* Tagged / Additional Addresses */}
            {taggedAddresses.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Additional / Tagged Locations ({taggedAddresses.length})
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {taggedAddresses.map((addr: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 text-xs space-y-1 bg-white">
                      <div className="font-bold text-[#095c7b]">{addr.tag || `Location ${idx + 1}`}</div>
                      <div className="text-slate-600">{addr.street}</div>
                      <div className="text-slate-500">
                        {[addr.city, addr.state, addr.zip].filter(Boolean).join(' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Contacts Section */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#095c7b]" />
              Contacts
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Key personnel and decision makers for this opportunity
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {contactsList.length === 0 ? (
              <div className="text-sm text-slate-500 italic py-4 text-center">
                No contact information provided.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {contactsList.map((contact, index) => (
                  <div
                    key={contact.id || index}
                    className={`p-5 rounded-xl border transition-all ${
                      contact.isPrimary
                        ? 'border-[#095c7b]/30 bg-[#095c7b]/5 shadow-sm'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <User className="h-4 w-4 text-[#095c7b]" />
                          {contact.name || 'Unnamed Contact'}
                        </h4>
                        {contact.title && (
                          <div className="text-xs font-semibold text-slate-500 mt-0.5">
                            {contact.title}
                          </div>
                        )}
                      </div>
                      {contact.isPrimary && (
                        <Badge className="bg-[#095c7b] text-white text-[10px] uppercase font-bold">
                          Primary
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 text-xs text-slate-600 border-t border-slate-200/60">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-[#095c7b] hover:underline font-medium break-all"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-slate-700 hover:text-[#095c7b] font-medium"
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Notes Section */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#095c7b]" />
              Notes
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Lead notes and comments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Add New Note Input */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#095c7b]" />
                Add Public Comment / Update Note
              </label>
              <Textarea
                placeholder="Type any additional notes, updates, or comments here..."
                value={newPublicNote}
                onChange={(e) => setNewPublicNote(e.target.value)}
                rows={3}
                className="bg-white border-slate-200 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddPublicNote}
                  disabled={isSubmittingNote || !newPublicNote.trim()}
                  className="bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs"
                >
                  {isSubmittingNote ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save Note
                </Button>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {rawNotesList.length > 0 ? (
                <div className="space-y-3">
                  {rawNotesList.map((note: any, idx: number) => {
                    const authorName = typeof note === 'object' ? note.author || 'User' : 'System';
                    const dateStr = typeof note === 'object' && note.date
                      ? new Date(note.date).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
                      : '';
                    const contentStr = typeof note === 'object' ? note.content : String(note);

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-400 font-medium">
                          <span className="font-bold text-slate-700">{authorName}</span>
                          {dateStr && <span>{dateStr}</span>}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-normal">
                          {contentStr}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : noteContentString ? (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {noteContentString}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic text-center py-4">
                  No notes have been logged for this opportunity yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </main>

      {/* Confirmation Dialogs */}
      <Dialog open={activeDialog !== null} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {activeDialog === 'lost' ? (
                <>
                  <XCircle className="h-6 w-6 text-rose-600" />
                  <span>Mark Opportunity as Lost</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <span>Convert Opportunity</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              {activeDialog === 'lost'
                ? `Are you sure you want to update the status of ${lead.companyName || 'this opportunity'} to Lost?`
                : `Are you sure you want to convert ${lead.companyName || 'this opportunity'} to Won?`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Optional Note / Reason:
            </label>
            <Textarea
              placeholder={
                activeDialog === 'lost'
                  ? 'Add reason or feedback for marking lost...'
                  : 'Add notes for converting this opportunity...'
              }
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              rows={3}
              className="text-sm border-slate-200"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setActiveDialog(null)}
              disabled={actionLoading}
              className="font-medium text-slate-600 rounded-xl"
            >
              Cancel
            </Button>

            {activeDialog === 'lost' ? (
              <Button
                onClick={() => handleExecuteAction('lost')}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Lost
              </Button>
            ) : (
              <Button
                onClick={() => handleExecuteAction('convert')}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Convert
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standardized MailPlus Footer per AGENTS.md rules */}
      <footer className="bg-[#f8fafb] border-t border-slate-200/80 py-8 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-semibold text-slate-700">
            <strong>MailPlus</strong> | Business logistics, made simple.
          </p>
          <p className="text-slate-500">
            Powered by MailPlus Australia
          </p>
          <p className="text-[11px] text-slate-400 pt-2">
            &copy; 2026 MailPlus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
