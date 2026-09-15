"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GraduationCap, Plus, Trash2, Bookmark, BookOpen, Check, Sparkles, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { UserAiTrainingConfig } from "@/lib/ask/query-spec";

interface AskTrainingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: UserAiTrainingConfig) => void;
}

export function AskTrainingDialog({ isOpen, onClose, onConfigSaved }: AskTrainingDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customInstructions, setCustomInstructions] = useState("");
  const [defaultChartType, setDefaultChartType] = useState<"bar" | "pie" | "table">("bar");
  const [vocabulary, setVocabulary] = useState<{ phrase: string; meaning: string }[]>([]);
  const [bookmarks, setBookmarks] = useState<{ id: string; label: string; queryText: string; icon?: string }[]>([]);
  const [corrections, setCorrections] = useState<{ id: string; question: string; correction: string; createdAt: string }[]>([]);

  const [newPhrase, setNewPhrase] = useState("");
  const [newMeaning, setNewMeaning] = useState("");

  const [newBookmarkLabel, setNewBookmarkLabel] = useState("");
  const [newBookmarkQuery, setNewBookmarkQuery] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      loadConfig();
    }
  }, [isOpen, user]);

  const loadConfig = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ask/training", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data: UserAiTrainingConfig = await res.json();
        setCustomInstructions(data.customInstructions || "");
        setDefaultChartType(data.defaultChartType || "bar");
        setVocabulary(data.customVocabulary || []);
        setBookmarks(data.bookmarkedQueries || []);
        setCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error("Failed to load training config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVocabulary = () => {
    if (!newPhrase.trim() || !newMeaning.trim()) {
      toast.error("Enter both term phrase and meaning");
      return;
    }
    setVocabulary(prev => [...prev, { phrase: newPhrase.trim(), meaning: newMeaning.trim() }]);
    setNewPhrase("");
    setNewMeaning("");
  };

  const handleDeleteVocabulary = (index: number) => {
    setVocabulary(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBookmark = () => {
    if (!newBookmarkLabel.trim() || !newBookmarkQuery.trim()) {
      toast.error("Enter both a bookmark name and query");
      return;
    }
    setBookmarks(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        label: newBookmarkLabel.trim(),
        queryText: newBookmarkQuery.trim(),
        icon: "Bookmark",
      },
    ]);
    setNewBookmarkLabel("");
    setNewBookmarkQuery("");
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const handleDeleteCorrection = (id: string) => {
    setCorrections(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const payload: UserAiTrainingConfig = {
        customInstructions: customInstructions.trim(),
        defaultChartType,
        customVocabulary: vocabulary,
        bookmarkedQueries: bookmarks,
        corrections,
      };

      const res = await fetch("/api/ask/training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("AI training preferences saved successfully!");
      if (onConfigSaved) onConfigSaved(payload);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] bg-white border border-border p-6 flex flex-col gap-4">
        <DialogHeader className="border-b border-border/50 pb-3">
          <div className="flex items-center gap-2 text-[#095c7b]">
            <GraduationCap className="h-6 w-6" />
            <DialogTitle className="text-lg font-serif font-bold text-slate-900">
              Teach & Personalize AI Assistant
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Train the AI on your specific territory, business vocabulary, and default formatting preferences.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-[#095c7b]" />
            <span className="text-xs">Loading your AI preferences...</span>
          </div>
        ) : (
          <Tabs defaultValue="instructions" className="w-full">
            <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-lg text-xs">
              <TabsTrigger value="instructions" className="text-xs">Instructions</TabsTrigger>
              <TabsTrigger value="vocabulary" className="text-xs">Vocabulary ({vocabulary.length})</TabsTrigger>
              <TabsTrigger value="bookmarks" className="text-xs">Bookmarks ({bookmarks.length})</TabsTrigger>
              <TabsTrigger value="corrections" className="text-xs">Corrections ({corrections.length})</TabsTrigger>
            </TabsList>

            {/* TAB 1: CUSTOM INSTRUCTIONS */}
            <TabsContent value="instructions" className="flex flex-col gap-4 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Custom Guidance & Default Scoping
                </Label>
                <p className="text-[11px] text-slate-500">
                  Tell the AI your default role rules, territory focus, or preferred phrasing.
                </p>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always scope queries to my Brisbane North territory by default. When asking for revenue, include GST. Default timeframes to last 30 days."
                  rows={4}
                  className="text-sm bg-[#FFFDF6] font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Default Visualization Style
                </Label>
                <div className="flex items-center gap-2">
                  {[
                    { type: "bar", label: "📊 Bar Chart" },
                    { type: "pie", label: "🍩 Donut / Pie" },
                    { type: "table", label: "📋 Data Table" },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setDefaultChartType(opt.type as any)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                        defaultChartType === opt.type
                          ? "bg-[#095c7b] text-white border-[#095c7b] shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CUSTOM VOCABULARY / SHORTHAND */}
            <TabsContent value="vocabulary" className="flex flex-col gap-3 pt-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold text-slate-800">Add Shorthand Rule</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    placeholder="Phrase (e.g. 'VIP leads')"
                    className="text-xs bg-white"
                  />
                  <Input
                    value={newMeaning}
                    onChange={(e) => setNewMeaning(e.target.value)}
                    placeholder="Meaning (e.g. 'totalScore > 80')"
                    className="text-xs bg-white"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddVocabulary}
                  className="bg-[#095c7b] hover:bg-[#07475f] text-white self-end text-xs h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Term
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
                {vocabulary.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No custom vocabulary terms defined yet.
                  </div>
                ) : (
                  vocabulary.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <strong className="text-[#095c7b]">"{v.phrase}"</strong> &rarr;{" "}
                        <span className="text-slate-700">{v.meaning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteVocabulary(i)}
                        className="text-slate-400 hover:text-rose-500 transition p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB 3: SAVED BOOKMARKS */}
            <TabsContent value="bookmarks" className="flex flex-col gap-3 pt-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold text-slate-800">Add 1-Click Bookmark</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={newBookmarkLabel}
                    onChange={(e) => setNewBookmarkLabel(e.target.value)}
                    placeholder="Label (e.g. 🔥 Top Pipeline)"
                    className="text-xs bg-white"
                  />
                  <Input
                    value={newBookmarkQuery}
                    onChange={(e) => setNewBookmarkQuery(e.target.value)}
                    placeholder="Query (e.g. Show my hot leads this week)"
                    className="text-xs bg-white"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddBookmark}
                  className="bg-[#095c7b] hover:bg-[#07475f] text-white self-end text-xs h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Bookmark
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No bookmarked queries yet.
                  </div>
                ) : (
                  bookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <strong className="text-slate-800">{b.label}</strong>:{" "}
                        <span className="text-slate-500 italic">"{b.queryText}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBookmark(b.id)}
                        className="text-slate-400 hover:text-rose-500 transition p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB 4: FEW-SHOT CORRECTIONS */}
            <TabsContent value="corrections" className="flex flex-col gap-3 pt-3">
              <p className="text-[11px] text-slate-500">
                These are corrections you taught the AI when clicking "💡 Correct This" on past answers.
              </p>
              <div className="max-h-56 overflow-y-auto flex flex-col gap-2">
                {corrections.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No AI corrections recorded yet. Click "💡 Correct This" on any response to train the model.
                  </div>
                ) : (
                  corrections.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteCorrection(c.id)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="text-slate-500 text-[11px]">When asked: <strong className="text-slate-800">"{c.question}"</strong></div>
                      <div className="text-[#095c7b] font-medium text-[11px]">Correction: {c.correction}</div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="border-t border-border/50 pt-3 gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#095c7b] hover:bg-[#07475f] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            Save AI Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
