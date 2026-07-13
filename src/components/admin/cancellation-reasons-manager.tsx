"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, FolderPlus, FilePlus2, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';

export default function CancellationReasonsManager() {
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [expandedWhys, setExpandedWhys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Dialog States
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);

  // Edit / Add States
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedWhyId, setSelectedWhyId] = useState('');
  const [editId, setEditId] = useState('');
  const [inputName, setInputName] = useState('');

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, 'cancellation_hierarchy'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setThemes(list);
    } catch (e) {
      console.error("Failed to load hierarchy:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load reasons hierarchy.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = (id: string) => {
    setExpandedThemes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWhy = (id: string) => {
    setExpandedWhys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveHierarchy = async (updatedThemes: any[]) => {
    const batch = writeBatch(firestore);
    const collectionRef = collection(firestore, 'cancellation_hierarchy');
    for (const t of updatedThemes) {
      const docRef = doc(collectionRef, t.id);
      batch.set(docRef, t);
    }
    await batch.commit();
    setThemes(updatedThemes);
    toast({ title: 'Success', description: 'Hierarchy updated successfully.' });
  };

  // Theme Add/Edit
  const handleOpenTheme = (mode: 'add' | 'edit', theme?: any) => {
    setModalMode(mode);
    if (mode === 'edit' && theme) {
      setEditId(theme.id);
      setInputName(theme.name);
    } else {
      setEditId(Math.floor(Math.random() * 1000).toString());
      setInputName('');
    }
    setThemeModalOpen(true);
  };

  const handleSaveTheme = async () => {
    if (!inputName.trim()) return;
    let updated = [...themes];
    if (modalMode === 'edit') {
      updated = updated.map(t => t.id === editId ? { ...t, name: inputName } : t);
    } else {
      updated.push({ id: editId, name: inputName, whys: [] });
    }
    await saveHierarchy(updated);
    setThemeModalOpen(false);
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm("Are you sure you want to delete this Theme and all its subcategories?")) return;
    const batch = writeBatch(firestore);
    // Delete document in Firestore
    const docRef = doc(collection(firestore, 'cancellation_hierarchy'), themeId);
    batch.delete(docRef);
    await batch.commit();
    setThemes(prev => prev.filter(t => t.id !== themeId));
    toast({ title: 'Theme Deleted' });
  };

  // Why Add/Edit
  const handleOpenWhy = (mode: 'add' | 'edit', themeId: string, why?: any) => {
    setModalMode(mode);
    setSelectedThemeId(themeId);
    if (mode === 'edit' && why) {
      setEditId(why.id);
      setInputName(why.name);
    } else {
      setEditId(Math.floor(Math.random() * 1000).toString());
      setInputName('');
    }
    setWhyModalOpen(true);
  };

  const handleSaveWhy = async () => {
    if (!inputName.trim()) return;
    const updated = themes.map(t => {
      if (t.id !== selectedThemeId) return t;
      let newWhys = [...(t.whys || [])];
      if (modalMode === 'edit') {
        newWhys = newWhys.map(w => w.id === editId ? { ...w, name: inputName } : w);
      } else {
        newWhys.push({ id: editId, name: inputName, reasons: [] });
      }
      return { ...t, whys: newWhys };
    });
    await saveHierarchy(updated);
    setWhyModalOpen(false);
  };

  const handleDeleteWhy = async (themeId: string, whyId: string) => {
    if (!confirm("Delete this subcategory?")) return;
    const updated = themes.map(t => {
      if (t.id !== themeId) return t;
      return { ...t, whys: (t.whys || []).filter((w: any) => w.id !== whyId) };
    });
    await saveHierarchy(updated);
  };

  // Reason Add/Edit
  const handleOpenReason = (mode: 'add' | 'edit', themeId: string, whyId: string, reason?: any) => {
    setModalMode(mode);
    setSelectedThemeId(themeId);
    setSelectedWhyId(whyId);
    if (mode === 'edit' && reason) {
      setEditId(reason.id);
      setInputName(reason.name);
    } else {
      setEditId(Math.floor(Math.random() * 1000).toString());
      setInputName('');
    }
    setReasonModalOpen(true);
  };

  const handleSaveReason = async () => {
    if (!inputName.trim()) return;
    const updated = themes.map(t => {
      if (t.id !== selectedThemeId) return t;
      const newWhys = (t.whys || []).map((w: any) => {
        if (w.id !== selectedWhyId) return w;
        let newReasons = [...(w.reasons || [])];
        if (modalMode === 'edit') {
          newReasons = newReasons.map(r => r.id === editId ? { ...r, name: inputName } : r);
        } else {
          newReasons.push({ id: editId, name: inputName });
        }
        return { ...w, reasons: newReasons };
      });
      return { ...t, whys: newWhys };
    });
    await saveHierarchy(updated);
    setReasonModalOpen(false);
  };

  const handleDeleteReason = async (themeId: string, whyId: string, reasonId: string) => {
    if (!confirm("Delete this reason?")) return;
    const updated = themes.map(t => {
      if (t.id !== themeId) return t;
      const newWhys = (t.whys || []).map((w: any) => {
        if (w.id !== whyId) return w;
        return { ...w, reasons: (w.reasons || []).filter((r: any) => r.id !== reasonId) };
      });
      return { ...t, whys: newWhys };
    });
    await saveHierarchy(updated);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Cancellation Hierarchy Manager</h1>
          <p className="text-muted-foreground">Manage the Themes, Subcategories (Whys), and Reasons hierarchy tree.</p>
        </div>
        <Button onClick={() => handleOpenTheme('add')} className="bg-[#095c7b] hover:bg-[#074760]">
          <Plus className="mr-2 h-4 w-4" /> Add Theme
        </Button>
      </div>

      <Card className="border-[#095c7b]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#095c7b]">Hierarchy Structure</CardTitle>
          <CardDescription>Click to expand and edit themes and nested categories.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {themes.map((theme) => {
              const isThemeExpanded = !!expandedThemes[theme.id];
              return (
                <div key={theme.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleTheme(theme.id)}>
                      {isThemeExpanded ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                      <span className="font-bold text-slate-700 text-sm md:text-base">{theme.name} <span className="text-xs font-normal text-slate-400">(id: {theme.id})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleOpenWhy('add', theme.id)}>
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => handleOpenTheme('edit', theme)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteTheme(theme.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isThemeExpanded && (
                    <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                      {(theme.whys || []).length === 0 ? (
                        <p className="text-xs italic text-slate-400 pl-6">No subcategories defined.</p>
                      ) : (
                        (theme.whys || []).map((why: any) => {
                          const isWhyExpanded = !!expandedWhys[why.id];
                          return (
                            <div key={why.id} className="pl-6 border-l-2 border-slate-100 space-y-2">
                              <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-lg border">
                                <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggleWhy(why.id)}>
                                  {isWhyExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                  <span className="font-semibold text-slate-700 text-sm">{why.name} <span className="text-xs font-normal text-slate-400">(id: {why.id})</span></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => handleOpenReason('add', theme.id, why.id)}>
                                    <FilePlus2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => handleOpenWhy('edit', theme.id, why)}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => handleDeleteWhy(theme.id, why.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {isWhyExpanded && (
                                <div className="pl-8 space-y-1.5 pt-1">
                                  {(why.reasons || []).length === 0 ? (
                                    <p className="text-xs italic text-slate-400 pl-4">No reasons defined.</p>
                                  ) : (
                                    (why.reasons || []).map((reason: any) => (
                                      <div key={reason.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md border border-dashed text-xs">
                                        <span className="text-slate-600 font-medium">{reason.name} <span className="text-[10px] text-slate-400">(id: {reason.id})</span></span>
                                        <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600" onClick={() => handleOpenReason('edit', theme.id, why.id, reason)}>
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600" onClick={() => handleDeleteReason(theme.id, why.id, reason.id)}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Dialog */}
      <Dialog open={themeModalOpen} onOpenChange={setThemeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Add Theme' : 'Edit Theme'}</DialogTitle>
            <DialogDescription>Themes are the top-level categories of cancellation reasons.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="themeName">Theme Name</Label>
              <Input id="themeName" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="e.g. Cost & Financial" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThemeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTheme} className="bg-[#095c7b] hover:bg-[#074760]">Save Theme</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Why Dialog */}
      <Dialog open={whyModalOpen} onOpenChange={setWhyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Add Subcategory (Why)' : 'Edit Subcategory (Why)'}</DialogTitle>
            <DialogDescription>Group reasons under a specific theme category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="whyName">Subcategory Name</Label>
              <Input id="whyName" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="e.g. Taking service in-house" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveWhy} className="bg-[#095c7b] hover:bg-[#074760]">Save Subcategory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason Dialog */}
      <Dialog open={reasonModalOpen} onOpenChange={setReasonModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Add Reason' : 'Edit Reason'}</DialogTitle>
            <DialogDescription>The concrete reason mapping for cancellations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reasonName">Reason Text</Label>
              <Input id="reasonName" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="e.g. Dissatisfied with service" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveReason} className="bg-[#095c7b] hover:bg-[#074760]">Save Reason</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
