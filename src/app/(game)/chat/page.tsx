"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Send, Sparkles, Pin, Trash2, Search, Plus, 
  MessageSquare, Copy, RotateCcw, Share2, CornerDownRight, 
  Bot, User, BrainCircuit, X, Check, ArrowRight
} from "lucide-react";
import { 
  sendMessageAction, 
  getConversationsAction, 
  getConversationAction, 
  deleteConversationAction, 
  renameConversationAction,
  clearAllConversationsAction
} from "@/actions/ai-actions";

interface ChatMessage {
  role: "user" | "assistant" | string;
  content: string;
  reasoning?: string;
  reasoning_details?: string;
  timestamp?: string | number | Date;
}

interface ChatConversation {
  id: string;
  title: string;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversationMessages = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getConversationAction(id);
      if (res.success) {
        const convoData = res.data as { messages?: ChatMessage[] } | null;
        setMessages(convoData?.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversationsAction();
      if (res.success) {
        setConversations(res.data as ChatConversation[]);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => loadConversations(), 0);
    // Load pinned conversation IDs from localStorage
    const saved = localStorage.getItem("pinned_chats");
    if (saved) {
      setTimeout(() => setPinnedIds(JSON.parse(saved)), 0);
    }
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      setTimeout(() => loadConversationMessages(activeConversationId), 0);
    } else {
      setTimeout(() => setMessages([]), 0);
    }
  }, [activeConversationId, loadConversationMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);





  const handleSend = async (contentToSend?: string) => {
    const text = contentToSend || input;
    if (!text.trim() || loading) return;

    if (!contentToSend) {
      setInput("");
    }

    setLoading(true);
    
    // Optimistic UI update
    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendMessageAction(text, activeConversationId || undefined);
      if (res.success) {
        const { content, reasoning_details, conversationId } = res.data;
        const assistantMsg = { 
          role: "assistant", 
          content, 
          reasoning_details, 
          timestamp: new Date().toISOString() 
        };
        
        setMessages((prev) => [...prev, assistantMsg]);
        
        if (!activeConversationId) {
          setActiveConversationId(conversationId);
        }
        await loadConversations();
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || loading) return;
    
    // Find the last user message to regenerate
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;
    const content = messages[lastUserMessageIndex].content;
    
    // Remove all messages after the last user message
    setMessages((prev) => prev.slice(0, lastUserMessageIndex + 1));
    setLoading(true);

    try {
      const res = await sendMessageAction(content, activeConversationId || undefined);
      if (res.success) {
        const { content: resContent, reasoning_details } = res.data;
        const assistantMsg = { 
          role: "assistant", 
          content: resContent, 
          reasoning_details, 
          timestamp: new Date().toISOString() 
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newPins = [...pinnedIds];
    if (pinnedIds.includes(id)) {
      newPins = newPins.filter((p) => p !== id);
    } else {
      newPins.push(id);
    }
    setPinnedIds(newPins);
    localStorage.setItem("pinned_chats", JSON.stringify(newPins));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      const res = await deleteConversationAction(id);
      if (res.success) {
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
        await loadConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Delete all conversations?")) return;
    try {
      const res = await clearAllConversationsAction();
      if (res.success) {
        setActiveConversationId(null);
        await loadConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `conversation-${activeConversationId || "export"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredConversations = conversations.filter(c => 
    (c.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });

  const suggestions = [
    "Design a custom Quest to learn Next.js App Router.",
    "Recommend how to level up my Intelligence stat today.",
    "Help me schedule three high priority tasks with burnout recovery.",
    "Brainstorm rewards for completing my weekly challenge."
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] rounded-2xl overflow-hidden border border-border glass-panel relative">
      
      {/* Sidebar: Conversations List */}
      <aside className="w-80 border-r border-border bg-card/65 flex flex-col h-full flex-shrink-0 hidden md:flex">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <button
            onClick={() => setActiveConversationId(null)}
            className="flex-1 bg-primary text-primary-foreground py-2 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md"
          >
            <Plus size={16} /> New Chat
          </button>
          <button
            onClick={handleClearAll}
            title="Clear All Chats"
            className="p-2 border border-border rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {sortedConversations.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              No conversations found.
            </div>
          ) : (
            sortedConversations.map((convo) => {
              const isSelected = activeConversationId === convo.id;
              const isPinned = pinnedIds.includes(convo.id);
              return (
                <div
                  key={convo.id}
                  onClick={() => setActiveConversationId(convo.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-primary/10 border border-primary/20 text-primary" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                    <span className="text-sm truncate font-medium max-w-[150px]">
                      {convo.title || "Untitled Chat"}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePin(convo.id, e)}
                      title={isPinned ? "Unpin chat" : "Pin chat"}
                      className={`p-1 rounded hover:bg-white/10 ${isPinned ? "text-yellow-500 opacity-100" : ""}`}
                    >
                      <Pin size={12} className={isPinned ? "fill-yellow-500" : ""} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(convo.id, e)}
                      title="Delete chat"
                      className="p-1 rounded hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <section className="flex-1 flex flex-col h-full bg-background/25">
        
        {/* Chat Header */}
        <header className="border-b border-border p-4 flex items-center justify-between bg-card/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500 flex items-center justify-center">
              <Bot className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-foreground flex items-center gap-1.5">
                RPG Assistant
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Active Coaching & Planning Agent</p>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all hover:bg-white/5"
              >
                <Share2 size={12} /> Export JSON
              </button>
              <button
                onClick={() => {
                  setMessages([]);
                  setActiveConversationId(null);
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-red-400 transition-all hover:bg-red-500/5"
              >
                <Trash2 size={12} /> Clear Chat
              </button>
            </div>
          )}
        </header>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center max-w-xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl shadow-xl shadow-primary/20 animate-bounce">
                🧙‍♂️
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-foreground">RPG Adventure Assistant</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-md">
                  I can design quests, recommend focus strategies, structure schedules, and help you unlock new stats. Ask me anything to begin!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-4">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleSend(sug)}
                    className="p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 text-xs font-bold text-foreground/80 hover:text-primary transition-all flex items-start gap-2.5 text-left group"
                  >
                    <CornerDownRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, index) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={index} className={`flex gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}>
                    
                    {/* Avatar */}
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-purple-400" />
                      </div>
                    )}

                    <div className="flex flex-col max-w-[85%] space-y-1">
                      
                      {/* Message Bubble */}
                      <div className={`p-4 rounded-2xl border text-sm leading-relaxed shadow-sm font-sans ${
                        isAssistant
                          ? "bg-card border-border text-foreground"
                          : "bg-primary/10 border-primary/20 text-foreground"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Bubble Action Bar */}
                      <div className={`flex items-center gap-2 text-[10px] text-muted-foreground px-2 ${
                        isAssistant ? "justify-start" : "justify-end"
                      }`}>
                        <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                        {isAssistant && (
                          <>
                            <span>•</span>
                            <button 
                              onClick={() => handleCopy(msg.content, index)}
                              className="hover:text-foreground flex items-center gap-0.5 transition-colors"
                            >
                              {copiedIndex === index ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                              {copiedIndex === index ? "Copied" : "Copy"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Action helper: Regenerate */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleRegenerate}
                  className="text-xs bg-background hover:bg-white/5 border border-border px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground font-bold flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw size={12} /> Regenerate Response
                </button>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-purple-400" />
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl max-w-[85%] flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full animate-bounce duration-1000" />
                <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full animate-bounce duration-1000 delay-150" />
                <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full animate-bounce duration-1000 delay-300" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <footer className="p-4 border-t border-border bg-card/15">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3 max-w-4xl mx-auto"
          >
            <input
              type="text"
              placeholder="Ask for quests, schedules, focus tips..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary text-primary-foreground p-3.5 rounded-xl font-bold hover:opacity-90 transition-all flex-shrink-0 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
