"use client";

import { MessageSquare, Lightbulb, AlertTriangle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCoachStore } from "@/stores/coach-store";
import { generateCoachInsightsAction } from "@/actions/game-actions";

export default function CoachPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { insights, loading, loadInsights } = useCoachStore();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadInsights(user.id);
    }
  }, [user?.id, loadInsights]);

  const handleForceAnalysis = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    try {
      await generateCoachInsightsAction(user.id);
      await loadInsights(user.id);
    } catch (err) {
      console.error(err);
      alert("Error generating insights");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-6 max-w-4xl mx-auto"><div className="h-32 bg-card rounded-2xl"></div><div className="h-32 bg-card rounded-2xl"></div></div>;
  }

  const getIcon = (type: string) => {
    switch(type) {
      case "positive": return <Sparkles className="text-success" size={24} />;
      case "warning": return <AlertTriangle className="text-danger" size={24} />;
      case "suggestion": return <Lightbulb className="text-primary" size={24} />;
      default: return <MessageSquare size={24} />;
    }
  };

  const getBorderColor = (type: string) => {
    switch(type) {
      case "positive": return "border-success/50 hover:shadow-[0_0_15px_rgba(var(--success),0.2)]";
      case "warning": return "border-danger/50 hover:shadow-[0_0_15px_rgba(var(--danger),0.2)]";
      case "suggestion": return "border-primary/50 hover:shadow-[0_0_15px_rgba(var(--primary),0.2)]";
      default: return "border-border";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <header className="mb-8 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          🤖
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
            AI Coach
          </h1>
          <p className="text-muted-foreground mt-1">Data-driven insights to optimize your progression.</p>
        </div>
      </header>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="rpg-panel p-8 rounded-xl text-center text-muted-foreground border-white/10">
            Gathering more data to generate insights... Keep completing quests or force an analysis!
          </div>
        ) : (
          insights.map((insight) => (
            <div key={insight.id} className={`rpg-panel rounded-2xl p-6 flex gap-6 transition-all border-white/10 ${getBorderColor(insight.type)}`}>
              <div className="shrink-0 pt-1">
                {getIcon(insight.type)}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{insight.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{insight.content}</p>
                <div className="text-xs text-muted-foreground mt-4 font-medium uppercase tracking-wider">
                  Generated {insight.createdAt ? new Date(insight.createdAt as string | number | Date).toLocaleDateString() : "Just now"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center mt-8">
        <button 
          onClick={handleForceAnalysis}
          disabled={isGenerating}
          className="bg-black/40 border border-purple-500/50 text-purple-300 hover:border-purple-500 px-6 py-3 rounded-xl font-bold transition-colors uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(168,85,247,0.2)] disabled:opacity-50"
        >
          {isGenerating ? "Analyzing..." : "Force New Analysis"}
        </button>
      </div>
    </div>
  );
}
