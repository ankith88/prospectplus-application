"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { AskSidebar } from "@/components/ask/ask-sidebar";
import { AskTrainingDialog } from "@/components/ask/ask-training-dialog";
import { ResultsView } from "@/components/ask/results-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic, MicOff, Search, Sparkles, Loader2, Info, MessageSquare,
  Plus, GraduationCap, Send, Flame, Receipt, Package, BarChart3, Clock, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { ALLOWED_ASK_UIDS } from "@/lib/constants";
import { AskChatMessage, AskChatSession, UserAiTrainingConfig } from "@/lib/ask/query-spec";

export function AskClient() {
  const { user } = useAuth();
  const { isListening, start, stop, transcript, isSupported } = useSpeechInput();

  // Chat Sessions & Active State
  const [chats, setChats] = useState<AskChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskChatMessage[]>([]);

  // Input & Query State
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // User Training & Dialogs
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [trainingConfig, setTrainingConfig] = useState<UserAiTrainingConfig | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAllowed = !!user && ALLOWED_ASK_UIDS.includes(user.uid);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Voice transcript synchronization
  useEffect(() => {
    if (transcript) {
      setQuestion((prev) => (prev ? prev + " " + transcript : transcript));
    }
  }, [transcript]);

  // Initial load: Fetch chat list and training config
  useEffect(() => {
    if (user && isAllowed) {
      loadChats();
      loadTrainingConfig();
    }
  }, [user, isAllowed]);

  const loadChats = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ask/chats", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const chatList: AskChatSession[] = data.chats || [];
        setChats(chatList);

        if (chatList.length > 0 && !activeChatId) {
          selectChat(chatList[0].id);
        } else if (chatList.length === 0) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  const loadTrainingConfig = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ask/training", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data: UserAiTrainingConfig = await res.json();
        setTrainingConfig(data);
      }
    } catch (err) {
      console.error("Failed to load training config:", err);
    }
  };

  const selectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/ask/chats?chatId=${chatId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data: AskChatSession = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch chat details:", err);
    }
  };

  const startNewChat = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const initialMsg: AskChatMessage = {
      id: "welcome",
      sender: "bot",
      timestamp: new Date().toISOString(),
      text: "👋 Welcome! I am your Ask Prospect+ AI Database & Analytics assistant. Ask questions about your pipeline, invoices, logistics scans, tickets, or territories.",
    };

    setActiveChatId(newId);
    setMessages([initialMsg]);
  };

  const saveChatToFirestore = async (chatId: string, updatedMessages: AskChatMessage[], title?: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/ask/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          id: chatId,
          title,
          messages: updatedMessages,
        }),
      });
      loadChats();
    } catch (err) {
      console.warn("Failed to save chat to Firestore:", err);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/ask/chats?chatId=${chatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      toast.success("Conversation deleted");
      const remaining = chats.filter((c) => c.id !== chatId);
      setChats(remaining);
      if (activeChatId === chatId) {
        if (remaining.length > 0) {
          selectChat(remaining[0].id);
        } else {
          startNewChat();
        }
      }
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/ask/chats", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ id: chatId, title: newTitle }),
      });
      toast.success("Conversation renamed");
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
      );
    } catch {
      toast.error("Failed to rename conversation");
    }
  };

  const handleAsk = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;
    if (!user) {
      toast.error("Please login to use Ask Prospect+");
      return;
    }

    const currentChatId = activeChatId || Math.random().toString(36).substring(2, 9);
    if (!activeChatId) setActiveChatId(currentChatId);

    const userMessage: AskChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      timestamp: new Date().toISOString(),
      text: trimmed,
    };

    // Find previous spec in conversation for contextual follow-up
    const lastBotMsg = [...messages].reverse().find((m) => m.sender === "bot" && m.result?.spec);
    const previousSpec = lastBotMsg?.result?.spec || null;

    const conversationHistory = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
      humanSummary: m.result?.humanSummary,
    }));

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuestion("");
    setLoading(true);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: trimmed,
          conversationHistory,
          previousSpec,
        }),
      });

      const data = await res.json();

      let botMessage: AskChatMessage;
      if (!res.ok || data.error) {
        botMessage = {
          id: Math.random().toString(),
          sender: "bot",
          timestamp: new Date().toISOString(),
          error: data.error || "I could not process this question.",
          suggestions: data.suggestions || ["Show my hot leads", "Count leads by status", "Quotes sent this week"],
        };
      } else {
        botMessage = {
          id: Math.random().toString(),
          sender: "bot",
          timestamp: new Date().toISOString(),
          text: data.humanSummary,
          result: data,
        };
      }

      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);

      // Auto-title chat from first query
      const chatTitle = messages.length <= 1 ? (trimmed.length > 32 ? trimmed.slice(0, 32) + "..." : trimmed) : undefined;
      saveChatToFirestore(currentChatId, finalMessages, chatTitle);
    } catch (err: any) {
      console.error("Ask query error:", err);
      const errorMsg: AskChatMessage = {
        id: Math.random().toString(),
        sender: "bot",
        timestamp: new Date().toISOString(),
        error: err.message || "An unexpected error occurred while querying the database.",
        suggestions: ["Show my hot leads", "Count leads by status"],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleMorningBriefing = () => {
    handleAsk("Generate a summary briefing for this week: leads entered, quotes sent, won deals, and overdue tasks.");
  };

  const toggleMic = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-slate-50 text-center p-6 gap-4">
        <div className="h-16 w-16 rounded-full bg-[#095c7b]/10 flex items-center justify-center text-[#095c7b]">
          <MessageSquare className="h-8 w-8 animate-pulse" />
        </div>
        <h3 className="font-serif font-bold text-slate-800 text-xl">Ask Prospect+ (Private Beta)</h3>
        <p className="text-slate-500 text-sm max-w-md leading-relaxed">
          Ask Prospect+ natural language database querying and analytics is currently in private beta testing for selected user accounts. We will activate access for your account soon!
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-background text-foreground">
      {/* 1. Left Multi-Chat Sidebar */}
      <AskSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={startNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onOpenTraining={() => setTrainingOpen(true)}
        bookmarks={trainingConfig?.bookmarkedQueries || []}
        onSelectBookmark={(query) => handleAsk(query)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main Conversational Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
        {/* Workspace Top Bar */}
        <div className="h-14 border-b border-border bg-white px-4 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#095c7b]/10 text-[#095c7b]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A3D33] font-serif leading-tight">
                Ask Prospect+ AI Assistant
              </h2>
              <span className="text-[10px] text-slate-400">
                Natural Language Analytics & Pipeline Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMorningBriefing}
              className="text-xs h-8 bg-amber-50/60 border-amber-200 text-amber-900 hover:bg-amber-100/80 gap-1 font-semibold"
            >
              <Flame className="h-3.5 w-3.5 text-amber-600" />
              Sales Briefing
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTrainingOpen(true)}
              className="text-xs h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <GraduationCap className="h-3.5 w-3.5 text-[#095c7b]" />
              Teach AI
            </Button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${
                msg.sender === "user" ? "items-end" : "items-start"
              } max-w-4xl mx-auto w-full`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                {msg.sender === "user" ? (
                  <span>You</span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-[#095c7b]">
                    <Sparkles className="h-3 w-3" /> Ask Prospect+
                  </span>
                )}
                <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>

              {/* Message Content Bubble */}
              {msg.sender === "user" ? (
                <div className="bg-gradient-to-r from-[#095c7b] to-[#07475f] text-white p-3.5 rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-xs max-w-xl">
                  {msg.text}
                </div>
              ) : (
                <div className="bg-white border border-border/90 rounded-2xl rounded-tl-none p-4 shadow-2xs w-full flex flex-col gap-3">
                  {/* Natural Language Summary Text */}
                  {msg.text && (
                    <div className="text-sm font-semibold text-slate-900 leading-snug">
                      {msg.text}
                    </div>
                  )}

                  {/* Error Notification */}
                  {msg.error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>{msg.error}</div>
                    </div>
                  )}

                  {/* Suggestions if Error or Empty */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Try asking:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAsk(sug)}
                            className="text-xs bg-slate-50 hover:bg-[#095c7b]/10 text-slate-700 hover:text-[#095c7b] border border-slate-200 px-2.5 py-1 rounded-full font-medium transition"
                          >
                            {sug} &rarr;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Results View (Charts, Tables, Actions) */}
                  {msg.result && (
                    <ResultsView
                      collection={msg.result.spec?.collection || "leads"}
                      intent={msg.result.spec?.intent || "list"}
                      rows={msg.result.rows}
                      columns={msg.result.columns}
                      value={msg.result.value}
                      chartType={msg.result.chartType}
                      humanSummary={msg.result.humanSummary}
                      insights={msg.result.insights}
                      spec={msg.result.spec}
                      suggestedFollowUps={msg.result.suggestedFollowUps}
                      onFollowUpClick={(prompt) => handleAsk(prompt)}
                      onTeachAiClick={() => setTrainingOpen(true)}
                      userName={user.displayName || user.email || "Prospect+ User"}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading Animation Bubble */}
          {loading && (
            <div className="flex flex-col gap-1.5 items-start max-w-4xl mx-auto w-full animate-fadeIn">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1 font-semibold text-[#095c7b]">
                  <Sparkles className="h-3 w-3" /> Ask Prospect+
                </span>
                <span>• Thinking...</span>
              </div>
              <div className="bg-white border border-border/90 rounded-2xl rounded-tl-none p-4 shadow-2xs flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-[#095c7b]" />
                <span className="text-xs font-medium text-slate-600">
                  Querying database, computing insights, and generating visualizations...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="border-t border-border bg-white p-3 sm:p-4 shrink-0 shadow-lg flex flex-col gap-2 max-w-4xl mx-auto w-full">
          {/* Quick Starter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Quick Starters:
            </span>
            {[
              { label: "🔥 Hot Leads", query: "Show my hot leads this week" },
              { label: "📊 Status Breakdown", query: "Count leads by status" },
              { label: "🧾 Invoices Last Month", query: "Show invoices from last month" },
              { label: "🚚 LocalMile Active", query: "Show LocalMile customers with terms accepted" },
              { label: "🔄 Bucket Movements", query: "Show bucket history this week" },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(chip.query)}
                className="text-xs whitespace-nowrap bg-slate-50 hover:bg-[#095c7b]/10 text-slate-700 hover:text-[#095c7b] border border-slate-200 px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 shadow-2xs shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything (e.g. 'Show hot leads in NSW' or 'Break down quotes by franchisee in a chart')"
                className="bg-[#FFFDF6] border-border text-foreground placeholder-muted-foreground pr-10 focus-visible:ring-[#095c7b] h-10 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(question);
                  }
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
                title={
                  isSupported
                    ? isListening
                      ? "Stop listening"
                      : "Start voice input"
                    : "Voice input not supported in this browser"
                }
                disabled={!isSupported}
              >
                {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </button>
            </div>

            <Button
              type="button"
              onClick={() => handleAsk(question)}
              disabled={loading || !question.trim()}
              className="bg-[#095c7b] hover:bg-[#07475f] text-white h-10 px-4 flex items-center gap-1.5 shadow-xs font-semibold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Teach AI Dialog */}
      <AskTrainingDialog
        isOpen={trainingOpen}
        onClose={() => setTrainingOpen(false)}
        onConfigSaved={(cfg) => setTrainingConfig(cfg)}
      />
    </div>
  );
}
