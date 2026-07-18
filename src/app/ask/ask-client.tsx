"use client"

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { TerminologyPanel } from "@/components/ask/terminology-panel";
import { ResultsView } from "@/components/ask/results-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Search, Sparkles, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

const INLINE_HINTS: { keywords: string[]; text: string; field: string }[] = [
  { keywords: ["dialer", "lead gen", "caller"], text: "Dialer assigned to the lead (e.g. dialerAssigned)", field: "dialerAssigned" },
  { keywords: ["bucket", "stage"], text: "Top-level group (e.g. outbound, inbound, nurture)", field: "bucket" },
  { keywords: ["status", "state"], text: "Specific pipeline stage (e.g. Hot Lead, Pre Qualified)", field: "status" },
  { keywords: ["account manager", "am"], text: "The assigned Account Manager (e.g. accountManagerAssigned)", field: "accountManagerAssigned" },
  { keywords: ["won", "win", "success"], text: "Filters leads where status is 'Won'", field: "status == 'Won'" }
];

export function AskClient() {
  const { user } = useAuth();
  const { isListening, start, stop, transcript, setTranscript, isSupported } = useSpeechInput();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeHint, setActiveHint] = useState<any>(null);

  // Synchronize voice transcript with the input field
  useEffect(() => {
    if (transcript) {
      setQuestion(prev => (prev ? prev + " " + transcript : transcript));
    }
  }, [transcript]);

  // Analyze question as the user types to trigger terminology hints
  useEffect(() => {
    const qLower = question.toLowerCase();
    const matched = INLINE_HINTS.find(hint =>
      hint.keywords.some(keyword => qLower.includes(keyword))
    );
    if (matched && question.trim().length > 0) {
      setActiveHint(matched);
    } else {
      setActiveHint(null);
    }
  }, [question]);

  const handleAsk = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    if (!user) {
      toast.error("Please login to use Ask Prospect+");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ question: trimmed })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process query");
      }

      if (data.error) {
        setResult({
          error: data.error,
          suggestions: data.suggestions || []
        });
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error("Ask query error:", err);
      toast.error(err.message || "An error occurred while fetching results");
      setResult({
        error: "I was unable to process your request. Try using simpler terms.",
        suggestions: ["Show my hot leads", "Count leads by status", "Quotes sent this week"]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExample = (q: string) => {
    setQuestion(q);
    handleAsk(q);
  };

  const toggleMic = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-65px)] bg-background text-foreground">
      {/* Main Workspace Area */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-[#095c7b]" />
          <h2 className="text-2xl font-bold tracking-tight text-[#1A3D33] font-serif">Ask Prospect+</h2>
        </div>

        {/* Ask input box */}
        <div className="bg-white border border-border p-4 rounded-xl flex flex-col gap-3 relative shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me a question (e.g. 'Show my hot leads this week' or 'Count leads by status')"
                className="bg-[#FFFDF6] border-border text-foreground placeholder-muted-foreground pr-10 focus-visible:ring-[#095c7b]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAsk(question);
                }}
              />
              <button
                type="button"
                onClick={toggleMic}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${
                  !isSupported
                    ? "text-muted-foreground cursor-not-allowed"
                    : isListening
                    ? "text-rose-500 animate-pulse"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={isSupported ? (isListening ? "Stop listening" : "Start speaking") : "Voice input not supported in this browser"}
                disabled={!isSupported}
              >
                {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </button>
            </div>
            <Button
              onClick={() => handleAsk(question)}
              disabled={loading}
              className="bg-[#095c7b] hover:bg-[#07475f] text-white flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Ask
            </Button>
          </div>

          {/* Listening Interim State */}
          {isListening && (
            <div className="text-xs text-rose-500 flex items-center gap-2 animate-pulse pl-1 font-semibold">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              Listening... (speak now)
            </div>
          )}

          {/* Autocomplete / Inline vocabulary hints */}
          {activeHint && (
            <div className="flex items-start gap-2 bg-[#095c7b]/5 border border-[#095c7b]/20 rounded-lg p-2.5 text-xs text-[#2A4E43] transition duration-200 animate-fadeIn">
              <Info className="h-4 w-4 shrink-0 text-[#095c7b]" />
              <div>
                <span className="font-semibold text-[#1A3D33]">Concept Tip:</span> {activeHint.text}{" "}
                <code className="bg-[#FFFDF6] border border-border px-1 py-0.5 rounded text-[10px] text-[#095c7b] font-mono">{activeHint.field}</code>
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
              <span className="text-sm font-medium">Analyzing question and querying database...</span>
            </div>
          ) : result ? (
            result.error ? (
              <div className="flex flex-col gap-4 max-w-md mx-auto py-12 text-center">
                <div className="text-foreground font-semibold">{result.error}</div>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground">Suggested queries:</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {result.suggestions.map((sug: string, i: number) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectExample(sug)}
                          className="bg-white border-border text-foreground hover:bg-slate-50"
                        >
                          {sug}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ResultsView
                collection={result.spec.collection}
                intent={result.spec.intent}
                rows={result.rows}
                columns={result.columns}
                value={result.value}
                humanSummary={result.humanSummary}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Sparkles className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold text-slate-700">Ask a question to see results.</p>
              <p className="text-xs text-muted-foreground">Your query results will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Glossary & Examples Side Helper */}
      <TerminologyPanel onSelectExample={handleSelectExample} />
    </div>
  );
}
