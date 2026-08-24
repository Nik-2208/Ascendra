"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, Copy } from "lucide-react";
import { rewriteAction } from "@/actions/ai-actions";

interface WritingAssistantProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholderText?: string;
}

export function WritingAssistant({ value, onChange, placeholderText = "Improve text..." }: WritingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalText, setOriginalText] = useState("");

  const handleRewrite = async (tone: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setOriginalText(value);
    try {
      const res = await rewriteAction(value, tone);
      if (res.success) {
        onChange(res.data);
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleUndo = () => {
    if (originalText) {
      onChange(originalText);
      setOriginalText("");
    }
  };

  return (
    <div className="relative inline-block text-left mt-1">
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs flex items-center gap-1 text-primary hover:text-primary-active bg-primary/10 border border-primary/20 px-2 py-1 rounded-md transition-all active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          )}
          <span>AI Writing Assistant</span>
        </button>

        {originalText && (
          <button
            type="button"
            onClick={handleUndo}
            className="text-[10px] text-muted-foreground hover:text-foreground bg-background border border-border px-1.5 py-0.5 rounded transition-all"
          >
            Undo
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-card border border-border p-1.5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1 select-none">
            Choose Tone / Adjustment
          </div>
          {[
            { label: "✨ Auto Improve", tone: "optimized, clear, and engaging" },
            { label: "👔 Professional", tone: "highly professional, formal, and articulate" },
            { label: "🤝 Friendly & Playful", tone: "warm, friendly, motivating, and game-oriented" },
            { label: "📝 Shorten", tone: "extremely concise, bullet-pointed, and brief" },
            { label: "📖 Expand", tone: "detailed, comprehensive, and descriptive" },
            { label: "🎯 Correct Grammar", tone: "grammatically correct, clean, and polished without changing the main ideas" },
          ].map((item) => (
            <button
              key={item.tone}
              type="button"
              onClick={() => handleRewrite(item.tone)}
              disabled={loading || !value.trim()}
              className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-white/5 rounded-lg text-foreground/90 hover:text-foreground transition-all disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
