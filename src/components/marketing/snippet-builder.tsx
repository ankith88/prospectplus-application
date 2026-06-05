'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Loader2, Plus, Save, Trash2, Copy, Image as ImageIcon, AlignLeft } from 'lucide-react';
import { VisualIframeEditor } from '@/components/ui/visual-iframe-editor';
import { BrandProfile } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

export interface Snippet {
  id?: string;
  name: string;
  type: 'banner' | 'footer';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function SnippetBuilder() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);

  // Editor states
  const [name, setName] = useState('');
  const [type, setType] = useState<'banner' | 'footer'>('footer');
  const [content, setContent] = useState('');
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');

  const { toast } = useToast();
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

  useEffect(() => {
    fetchSnippets();
    fetchBrandProfile();
  }, []);

  const fetchBrandProfile = async () => {
    try {
      const docRef = doc(firestore, 'brandProfiles', 'default_company');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBrandProfile(docSnap.data() as BrandProfile);
      }
    } catch (error) {
      console.error('Error fetching brand profile:', error);
    }
  };

  const fetchSnippets = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, 'marketing_snippets'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Snippet[];
      setSnippets(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error('Error fetching snippets:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch snippets.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSnippet = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setName(snippet.name);
    setType(snippet.type);
    setContent(snippet.content);
  };

  const handleNewSnippet = () => {
    setSelectedSnippet(null);
    setName('');
    setType('footer');
    setContent('<p style="text-align: center; font-size: 12px; color: #888;">Your default footer content here.</p>');
  };

  const handleSave = async () => {
    if (!name || !content) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and content are required.'
      });
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data = {
        name,
        type,
        content,
        updatedAt: now
      };

      if (selectedSnippet?.id) {
        // Update
        const ref = doc(firestore, 'marketing_snippets', selectedSnippet.id);
        await updateDoc(ref, data);
        toast({ title: 'Success', description: 'Snippet updated successfully.' });
      } else {
        // Create
        const docRef = await addDoc(collection(firestore, 'marketing_snippets'), {
          ...data,
          createdAt: now
        });
        setSelectedSnippet({ id: docRef.id, ...data, createdAt: now });
        toast({ title: 'Success', description: 'Snippet created successfully.' });
      }
      fetchSnippets();
    } catch (error) {
      console.error('Error saving snippet:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the snippet to database.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this snippet?')) return;

    try {
      await deleteDoc(doc(firestore, 'marketing_snippets', id));
      toast({ title: 'Snippet Deleted' });
      if (selectedSnippet?.id === id) {
        handleNewSnippet();
      }
      fetchSnippets();
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed'
      });
    }
  };

  const handleDuplicate = async (snippet: Snippet, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data = {
        name: `${snippet.name} (Copy)`,
        type: snippet.type,
        content: snippet.content,
        updatedAt: now
      };

      await addDoc(collection(firestore, 'marketing_snippets'), {
        ...data,
        createdAt: now
      });
      toast({ title: 'Success', description: 'Snippet duplicated successfully.' });
      fetchSnippets();
    } catch (error) {
      console.error('Error duplicating snippet:', error);
      toast({
        variant: 'destructive',
        title: 'Duplicate Failed',
        description: 'Could not duplicate.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
      {/* Sidebar */}
      <Card className="lg:col-span-1 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-4 py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Banners & Footers</CardTitle>
            <CardDescription className="text-xs">Manage reusable blocks</CardDescription>
          </div>
          <Button size="sm" onClick={handleNewSnippet} className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-1">
            <Plus className="h-4 w-4" /> New
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col h-60 items-center justify-center p-6 text-center text-muted-foreground gap-2">
              <AlignLeft className="h-8 w-8 opacity-40" />
              <span className="text-sm">No snippets built yet. Click 'New' to start.</span>
            </div>
          ) : (
            <div className="divide-y">
              {snippets.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSnippet(s)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${
                    selectedSnippet?.id === s.id ? 'bg-slate-100 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-2">
                    <span className="font-medium text-sm truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      {s.type === 'banner' ? <ImageIcon className="h-3 w-3" /> : <AlignLeft className="h-3 w-3" />}
                      {s.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Updated {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => handleDuplicate(s, e)}
                      title="Duplicate Snippet"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(s.id!, e)}
                      title="Delete Snippet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Card className="lg:col-span-3 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-lg">
              {selectedSnippet?.id ? `Edit ${type === 'banner' ? 'Banner' : 'Footer'}: ${name}` : 'New Snippet'}
            </CardTitle>
            <CardDescription className="text-xs">Create reusable blocks for templates</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Snippet Name</label>
              <Input
                placeholder="e.g. EOFY Promo Banner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
              <div className="flex border rounded-md overflow-hidden bg-slate-50">
                <Button
                  type="button"
                  variant={type === 'banner' ? 'default' : 'ghost'}
                  className="flex-1 rounded-none h-10"
                  onClick={() => setType('banner')}
                >
                  <ImageIcon className="h-4 w-4 mr-2" /> Banner
                </Button>
                <Button
                  type="button"
                  variant={type === 'footer' ? 'default' : 'ghost'}
                  className="flex-1 rounded-none h-10"
                  onClick={() => setType('footer')}
                >
                  <AlignLeft className="h-4 w-4 mr-2" /> Footer
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2 flex-1 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center shrink-0 flex-wrap gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</label>
              <div className="flex border rounded-md overflow-hidden bg-slate-100">
                <Button
                  size="sm"
                  variant={editorMode === 'visual' ? 'default' : 'ghost'}
                  onClick={() => setEditorMode('visual')}
                  className="h-7 text-xs px-3 rounded-none"
                >
                  Visual
                </Button>
                <Button
                  size="sm"
                  variant={editorMode === 'code' ? 'default' : 'ghost'}
                  onClick={() => setEditorMode('code')}
                  className="h-7 text-xs px-3 rounded-none"
                >
                  HTML Code
                </Button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col relative bg-slate-50">
               {editorMode === 'visual' ? (
                  <VisualIframeEditor 
                    body={content} 
                    setBody={setContent}
                    primaryColor={brandProfile?.designTokens?.primaryColor || '#095C7B'}
                    fontFamily={brandProfile?.designTokens?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}
                    logoUrl={brandProfile?.designTokens?.logoUrl}
                  />
                ) : (
                  <Textarea
                    placeholder="HTML content..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 font-mono text-sm bg-slate-50 focus-visible:bg-white transition-colors p-4 resize-none border-slate-300 shadow-sm min-h-[400px]"
                  />
                )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
