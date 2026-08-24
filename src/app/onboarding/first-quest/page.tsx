"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Target, Book, Droplet } from "lucide-react";
import { useSession } from "next-auth/react";
import { completeOnboardingAction } from "@/actions/game-actions";

const FIRST_QUESTS = [
  {
    id: "q_water",
    title: "Drink a glass of water right now",
    stat: "health" as const,
    icon: Droplet,
  },
  {
    id: "q_pushups",
    title: "Do 5 pushups immediately",
    stat: "strength" as const,
    icon: Swords,
  },
  {
    id: "q_focus",
    title: "Close all distracting tabs",
    stat: "focus" as const,
    icon: Target,
  },
  {
    id: "q_book",
    title: "Read 1 page of a book",
    stat: "knowledge" as const,
    icon: Book,
  }
];

export default function FirstQuestPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!selectedQuest || !user) return;
    setSaving(true);

    try {
      const charClass = localStorage.getItem("onboarding_class") || "warrior";
      const name = localStorage.getItem("onboarding_name") || "Adventurer";
      const avatar = localStorage.getItem("onboarding_avatar") || "🧙‍♂️";

      const questDef = FIRST_QUESTS.find(q => q.id === selectedQuest);

      await completeOnboardingAction(user.id || user.email!, {
        displayName: name,
        className: charClass,
        avatar,
        firstQuestTitle: questDef?.title || "My First Quest",
        firstQuestStat: questDef?.stat || "health"
      });


      router.push("/");
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-white">The First Trial</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every epic saga begins with a single step. Choose an action you will commit to doing <strong>right now</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {FIRST_QUESTS.map((q) => {
          const isSelected = selectedQuest === q.id;
          const Icon = q.icon;
          
          return (
            <div 
              key={q.id}
              onClick={() => setSelectedQuest(q.id)}
              className={`rpg-panel rpg-panel-interactive p-6 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-6 ${
                isSelected 
                  ? "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.02]" 
                  : "hover:border-purple-500/50 hover:bg-white/5"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-black/50 text-muted-foreground"
              }`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{q.title}</h3>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {q.stat} +
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleFinish}
          disabled={!selectedQuest || saving}
          className="group relative inline-flex items-center justify-center px-12 py-4 font-bold text-white transition-all duration-200 bg-success rounded-full hover:shadow-[0_0_40px_rgba(var(--success),0.6)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="uppercase tracking-widest text-sm flex items-center gap-2">
            {saving ? "Forging Legend..." : "Accept Quest & Enter World"}
          </span>
        </button>
        <p className="text-xs text-muted-foreground">This action cannot be undone. Are you ready?</p>
      </div>
    </div>
  );
}
