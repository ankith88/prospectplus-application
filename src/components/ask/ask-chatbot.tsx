"use client"

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, X, Send, Loader2, MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResultsView } from "@/components/ask/results-view";

interface Message {
  id: string;
  sender: "user" | "bot";
  text?: string;
  result?: any;
  error?: string;
}

const ALLOWED_UID = "ncyhwLtOG1W7TZ43PkYCcObeCAf2";

export function AskChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am your Ask Prospect+ database assistant. Ask me anything about leads, companies, users, or franchisee territories."
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!user) return null;

  const isAllowed = user.uid === ALLOWED_UID;

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsgId = Math.random().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: trimmed
    };

    setMessages(prev => [...prev, newUserMsg]);
    setQuestion("");
    setLoading(true);

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
      
      const botMsgId = Math.random().toString();
      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: botMsgId,
          sender: "bot",
          error: data.error || "Failed to query database."
        }]);
      } else if (data.error) {
        setMessages(prev => [...prev, {
          id: botMsgId,
          sender: "bot",
          error: data.error
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: botMsgId,
          sender: "bot",
          text: data.humanSummary,
          result: data
        }]);
      }
    } catch (err: any) {
      console.error("Chatbot query error:", err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "bot",
        error: err.message || "An unexpected error occurred."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 border-none ${
            isOpen 
              ? "bg-rose-600 hover:bg-rose-700 text-white" 
              : "bg-[#095c7b] hover:bg-[#07475f] text-white animate-bounce"
          }`}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </Button>
      </div>

      {/* Slide-out Drawer Container */}
      <div
        className={`fixed top-0 right-0 h-full w-[450px] max-w-[90vw] bg-white border-l border-border shadow-2xl z-40 transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/80 bg-[#095c7b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#eaf143]" />
            <h3 className="font-serif font-semibold text-lg">Ask Prospect+ Assistant</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-white/80 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
          {!isAllowed ? (
            /* Coming Soon Screen */
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-4 animate-fadeIn">
              <div className="h-16 w-16 rounded-full bg-[#095c7b]/10 flex items-center justify-center text-[#095c7b]">
                <MessageSquare className="h-8 w-8 animate-pulse" />
              </div>
              <h4 className="font-serif font-bold text-slate-800 text-lg">Ask Chatbot (Coming Soon)</h4>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                This feature is currently in private beta testing. We are fine-tuning natural language capabilities for your role and will activate it on your account soon!
              </p>
            </div>
          ) : (
            /* Allowed Chat Screen */
            <>
              {messages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex flex-col gap-1.5 ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Chat bubble text */}
                  {msg.text && (
                    <div 
                      className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                        msg.sender === "user" 
                          ? "bg-[#095c7b] text-white rounded-br-none" 
                          : "bg-white border border-border text-slate-700 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Errors */}
                  {msg.error && (
                    <div className="max-w-[85%] p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl rounded-bl-none text-xs leading-relaxed flex items-start gap-2 shadow-sm">
                      <Info className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>{msg.error}</div>
                    </div>
                  )}

                  {/* Embedded Results Panel */}
                  {msg.result && (
                    <div className="w-full mt-2 max-w-full overflow-hidden bg-white border border-border rounded-xl p-3 shadow-sm">
                      <ResultsView
                        collection={msg.result.spec.collection}
                        intent={msg.result.spec.intent}
                        rows={msg.result.rows}
                        columns={msg.result.columns}
                        value={msg.result.value}
                        humanSummary={msg.result.humanSummary}
                        spec={msg.result.spec}
                      />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white border border-border px-3 py-2 rounded-xl rounded-bl-none self-start shadow-sm animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#095c7b]" />
                  Querying CRM database...
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar (Only render input if user is allowed) */}
        {isAllowed && (
          <div className="p-3 border-t border-border bg-white shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask your query (e.g. 'Show my hot leads')"
                className="flex-1 bg-slate-50 border-border focus-visible:ring-[#095c7b] text-sm h-10"
                onKeyDown={e => {
                  if (e.key === "Enter") handleSend();
                }}
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !question.trim()}
                className="bg-[#095c7b] hover:bg-[#07475f] text-white shrink-0 h-10 w-10 p-0 rounded-lg flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[10px] text-center text-muted-foreground mt-2 font-medium">
              Mapping fields & query limits enforced.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
