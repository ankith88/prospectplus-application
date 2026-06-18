'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BrandProfile } from '@/lib/types';
import { Loader2, Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

export default function BrandBotPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Marketing Admin' || userProfile?.activeRole === 'Marketing Manager';

  const [brandProfile, setBrandProfile] = useState<Partial<BrandProfile>>({
    strategy: {
      positioning: '',
      brandMessaging: '',
      offers: [],
      icps: []
    },
    voice: {
      toneKeywords: [],
      soundsLikeUsExamples: []
    },
    designTokens: {
      primaryColor: '#095c7b',
      accentColor: '#eaf143',
      fontFamily: 'Inter, sans-serif',
      logoUrl: ''
    },
    marketingBrainContext: {
      topPerformingKeywords: [],
      learnedBehaviorModifiers: '',
      lastAnalysisTimestamp: ''
    }
  });

  const [newOffer, setNewOffer] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newExample, setNewExample] = useState('');

  useEffect(() => {
    fetchBrandProfile();
  }, []);

  const fetchBrandProfile = async () => {
    setLoading(true);
    try {
      const docRef = doc(firestore, 'brandProfiles', 'default_company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as BrandProfile;
        setBrandProfile(data);
      }
    } catch (error) {
      console.error("Error fetching brand profile:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch brand profile.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: 'You do not have permission to update the brand profile.'
      });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updatedProfile = {
        ...brandProfile,
        updatedAt: now,
        updatedBy: userProfile?.uid || 'unknown'
      };

      await setDoc(doc(firestore, 'brandProfiles', 'default_company'), updatedProfile, { merge: true });
      
      toast({
        title: 'Success',
        description: 'Brand profile updated successfully.'
      });
    } catch (error) {
      console.error("Error saving brand profile:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save brand profile.'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateStrategy = (key: keyof BrandProfile['strategy'], value: any) => {
    setBrandProfile(prev => ({
      ...prev,
      strategy: {
        ...(prev.strategy as any),
        [key]: value
      }
    }));
  };

  const updateVoice = (key: keyof BrandProfile['voice'], value: any) => {
    setBrandProfile(prev => ({
      ...prev,
      voice: {
        ...(prev.voice as any),
        [key]: value
      }
    }));
  };

  const updateDesign = (key: keyof BrandProfile['designTokens'], value: any) => {
    setBrandProfile(prev => ({
      ...prev,
      designTokens: {
        ...(prev.designTokens as any),
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Unauthorized</h2>
        <p className="text-muted-foreground mt-2">You need Admin, Marketing Admin, or Marketing Manager privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brand Bot Configuration</h1>
        <p className="text-muted-foreground">Configure the core strategy, voice, and design rules for AI marketing generation.</p>
      </div>

      <Card id="step-brand-bot-config">
        <CardHeader>
          <CardTitle>1. Core Strategy</CardTitle>
          <CardDescription>Define the fundamental positioning and offers of your business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Core Positioning</label>
            <Textarea 
              placeholder="e.g., The fastest parcel delivery network for small businesses."
              value={brandProfile.strategy?.positioning || ''}
              onChange={(e) => updateStrategy('positioning', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Messaging Framework</label>
            <Textarea 
              placeholder="e.g., We save you time so you can focus on your business."
              value={brandProfile.strategy?.brandMessaging || ''}
              onChange={(e) => updateStrategy('brandMessaging', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Key Offers</label>
            <div className="flex gap-2 mb-2">
              <Input 
                placeholder="e.g., Free 14-day trial" 
                value={newOffer}
                onChange={(e) => setNewOffer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newOffer) {
                    updateStrategy('offers', [...(brandProfile.strategy?.offers || []), newOffer]);
                    setNewOffer('');
                  }
                }}
              />
              <Button onClick={() => {
                if (newOffer) {
                  updateStrategy('offers', [...(brandProfile.strategy?.offers || []), newOffer]);
                  setNewOffer('');
                }
              }}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {brandProfile.strategy?.offers?.map((offer, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md text-sm">
                  {offer}
                  <button onClick={() => updateStrategy('offers', brandProfile.strategy!.offers!.filter((_, index) => index !== i))}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Voice Guidelines</CardTitle>
          <CardDescription>Train the AI on how to sound like your brand.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tone Keywords</label>
            <div className="flex gap-2 mb-2">
              <Input 
                placeholder="e.g., Professional, Helpful, Urgent" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKeyword) {
                    updateVoice('toneKeywords', [...(brandProfile.voice?.toneKeywords || []), newKeyword]);
                    setNewKeyword('');
                  }
                }}
              />
              <Button onClick={() => {
                if (newKeyword) {
                  updateVoice('toneKeywords', [...(brandProfile.voice?.toneKeywords || []), newKeyword]);
                  setNewKeyword('');
                }
              }}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {brandProfile.voice?.toneKeywords?.map((kw, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md text-sm">
                  {kw}
                  <button onClick={() => updateVoice('toneKeywords', brandProfile.voice!.toneKeywords!.filter((_, index) => index !== i))}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">"Sounds Like Us" Examples</label>
            <div className="flex gap-2 mb-2">
              <Textarea 
                placeholder="Paste an excerpt of an email or copy that perfectly captures your brand voice..." 
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
              />
              <Button onClick={() => {
                if (newExample) {
                  updateVoice('soundsLikeUsExamples', [...(brandProfile.voice?.soundsLikeUsExamples || []), newExample]);
                  setNewExample('');
                }
              }} className="h-auto"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {brandProfile.voice?.soundsLikeUsExamples?.map((ex, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-50 p-3 rounded-md text-sm border">
                  <p className="flex-1 italic">"{ex}"</p>
                  <button onClick={() => updateVoice('soundsLikeUsExamples', brandProfile.voice!.soundsLikeUsExamples!.filter((_, index) => index !== i))} className="mt-1">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="step-design-tokens">
        <CardHeader>
          <CardTitle>3. Design Tokens</CardTitle>
          <CardDescription>Centralized style variables for AI generated campaigns and layouts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Color</label>
              <div className="flex gap-2">
                <Input type="color" value={brandProfile.designTokens?.primaryColor} onChange={(e) => updateDesign('primaryColor', e.target.value)} className="w-16 p-1 h-10" />
                <Input value={brandProfile.designTokens?.primaryColor} onChange={(e) => updateDesign('primaryColor', e.target.value)} className="font-mono uppercase" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Accent Color</label>
              <div className="flex gap-2">
                <Input type="color" value={brandProfile.designTokens?.accentColor} onChange={(e) => updateDesign('accentColor', e.target.value)} className="w-16 p-1 h-10" />
                <Input value={brandProfile.designTokens?.accentColor} onChange={(e) => updateDesign('accentColor', e.target.value)} className="font-mono uppercase" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Family</label>
            <Input value={brandProfile.designTokens?.fontFamily} onChange={(e) => updateDesign('fontFamily', e.target.value)} placeholder="e.g., Inter, sans-serif" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Company Logo URL</label>
            <Input value={brandProfile.designTokens?.logoUrl || ''} onChange={(e) => updateDesign('logoUrl', e.target.value)} placeholder="e.g., https://example.com/logo.png" />
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 leading-normal">
          <span className="font-bold">Tip:</span> Saving your Brand Profile trains the AI. You can now generate outbound email copies that automatically match these guidelines by visiting the <Link href="/admin/marketing" className="underline font-semibold hover:text-blue-900 transition-colors">Template Builder</Link>.
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Brand Profile
        </Button>
      </div>
    </div>
  );
}
