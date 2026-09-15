"use client";

import React, { useState } from "react";
import {
  Plus, MessageSquare, Trash2, Edit2, Bookmark, GraduationCap,
  Sparkles, ChevronLeft, ChevronRight, Check, X, Search, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AskChatSession } from "@/lib/ask/query-spec";

interface AskSidebarProps {
  chats: AskChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onOpenTraining: () => void;
  bookmarks: { id: string; label: string; queryText: string; icon?: string }[];
  onSelectBookmark: (query: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AskSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onOpenTraining,
  bookmarks,
  onSelectBookmark,
  isCollapsed,
  onToggleCollapse,
}: AskSidebarProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredChats = chats.filter((c) =>
    (c.title || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Group chats by date (Today, Yesterday, Previous 7 Days, Older)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const last7DaysStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups: { label: string; items: AskChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  filteredChats.forEach((chat) => {
    const time = new Date(chat.updatedAt || chat.createdAt).getTime();
    if (time >= todayStart) {
      groups[0].items.push(chat);
    } else if (time >= yesterdayStart) {
      groups[1].items.push(chat);
    } else if (time >= last7DaysStart) {
      groups[2].items.push(chat);
    } else {
      groups[3].items.push(chat);
    }
  });

  const startRename = (chat: AskChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const confirmRename = (chatId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-slate-50/80 flex flex-col items-center py-4 gap-4 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          title="Expand Sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="p-2 rounded-full bg-[#095c7b] text-white hover:bg-[#07475f] shadow-xs"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenTraining}
          className="p-2 rounded-lg text-slate-600 hover:text-[#095c7b] hover:bg-slate-200 transition mt-auto"
          title="Teach AI / Custom Instructions"
        >
          <GraduationCap className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 sm:w-72 border-r border-border bg-slate-50/90 flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <Button
          type="button"
          onClick={onNewChat}
          className="bg-[#095c7b] hover:bg-[#07475f] text-white flex-1 text-xs font-semibold gap-1.5 h-9 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Bookmarked Quick Queries */}
      {bookmarks && bookmarks.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-border/60 flex flex-col gap-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Bookmark className="h-3 w-3" /> Starred Queries
          </div>
          <div className="flex flex-col gap-1">
            {bookmarks.slice(0, 4).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBookmark(b.queryText)}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-[#095c7b]/10 text-slate-700 hover:text-[#095c7b] transition truncate font-medium flex items-center gap-1.5"
                title={b.queryText}
              >
                <span className="text-[11px]">⚡</span>
                <span className="truncate">{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Search */}
      <div className="px-3 pt-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search conversations..."
            className="text-xs pl-8 h-8 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-4">
        {groups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.label} className="flex flex-col gap-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                {group.label}
              </div>
              {group.items.map((chat) => {
                const isActive = chat.id === activeChatId;
                const isEditing = chat.id === editingChatId;

                return (
                  <div
                    key={chat.id}
                    onClick={() => !isEditing && onSelectChat(chat.id)}
                    className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                      isActive
                        ? "bg-[#095c7b] text-white font-semibold shadow-2xs"
                        : "text-slate-700 hover:bg-slate-200/80 font-medium"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-6 text-xs px-1.5 bg-white text-slate-900"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmRename(chat.id);
                            if (e.key === "Escape") setEditingChatId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => confirmRename(chat.id, e)}
                          className="text-emerald-500 hover:text-emerald-600 p-0.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="text-rose-500 hover:text-rose-600 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate flex-1 mr-1">
                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white/80" : "text-slate-400"}`} />
                          <span className="truncate">{chat.title || "Untitled Conversation"}</span>
                        </div>

                        {/* Hover Actions */}
                        <div className={`items-center gap-1 shrink-0 ${isActive ? "flex" : "hidden group-hover:flex"}`}>
                          <button
                            type="button"
                            onClick={(e) => startRename(chat, e)}
                            className={`p-1 rounded transition ${
                              isActive ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-slate-700"
                            }`}
                            title="Rename"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className={`p-1 rounded transition ${
                              isActive ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-rose-600"
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {filteredChats.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            No conversations found.
          </div>
        )}
      </div>

      {/* Footer / Teach AI Button */}
      <div className="p-3 border-t border-border/80 bg-slate-100/60">
        <button
          type="button"
          onClick={onOpenTraining}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#095c7b] hover:border-[#095c7b]/40 shadow-2xs transition"
        >
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-[#095c7b]" />
            <span>Teach & Train AI</span>
          </div>
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
        </button>
      </div>
    </div>
  );
}
