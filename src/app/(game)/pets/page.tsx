"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPets, equipPetAction, feedPetAction } from "@/actions/pet-actions";
import { Heart, Utensils, Smile, Sparkles, Shield, Moon, Eye } from "lucide-react";
import { gameMath } from "@/lib/game-math";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PET_TEMPLATES, getEvolutionEmoji, calculatePetMood } from "@/lib/pet-engine";

export default function CompanionsPage() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [sleepingPets, setSleepingPets] = useState<Record<string, boolean>>({});

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => getPets(),
  });

  const equipPet = useMutation({
    mutationFn: ({ id, equip }: { id: string; equip: boolean }) => equipPetAction(id, equip),
    onSuccess: () => {
      import("@/lib/sound-engine").then(m => m.soundEngine.playLevelUp());
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    }
  });

  const feedPet = useMutation({
    mutationFn: feedPetAction,
    onSuccess: (_, petId) => {
      import("@/lib/sound-engine").then(m => m.soundEngine.playQuestComplete());
      setMessages(prev => ({ ...prev, [petId]: "Nourished! (+20 Hunger, +5 Joy)" }));
      setTimeout(() => setMessages(prev => ({ ...prev, [petId]: "" })), 3000);
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    }
  });

  const playPet = useMutation({
    mutationFn: async (petId: string) => {
      // Direct local simulation that triggers sound & state message
      return { success: true };
    },
    onSuccess: (_, petId) => {
      import("@/lib/sound-engine").then(m => m.soundEngine.playQuestComplete());
      setMessages(prev => ({ ...prev, [petId]: "Played! (+15 Joy)" }));
      setTimeout(() => setMessages(prev => ({ ...prev, [petId]: "" })), 3000);
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    }
  });

  const toggleSleep = (petId: string) => {
    const isSleeping = !sleepingPets[petId];
    setSleepingPets(prev => ({ ...prev, [petId]: isSleeping }));
    import("@/lib/sound-engine").then(m => m.soundEngine.playQuestComplete());
    setMessages(prev => ({ ...prev, [petId]: isSleeping ? "Sleeping... recovering energy" : "Awake and alert!" }));
    setTimeout(() => setMessages(prev => ({ ...prev, [petId]: "" })), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 drop-shadow-md flex items-center gap-2">
            <Sparkles size={28} className="text-purple-400" /> Companions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Nurture your companions. They provide permanent stat multipliers as they evolve.
          </p>
        </div>
      </header>

      {pets.length === 0 ? (
        <div className="rpg-panel rounded-2xl p-16 text-center border-dashed border-2 border-white/10 flex flex-col items-center justify-center">
          <span className="text-5xl mb-4">🥚</span>
          <h2 className="text-xl font-bold font-serif text-white">No Companions Hatched</h2>
          <p className="text-sm text-muted-foreground mt-1">Defeat bosses or complete milestone chains to discover eggs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => {
            const stats = pet.stats || { hunger: 80, happiness: 90, loyalty: 20 };
            
            // Match with templates to get correct details & bonuses
            const template = PET_TEMPLATES.find(t => t.id === pet.species || t.id.endsWith(pet.species.toLowerCase())) || PET_TEMPLATES[0];
            
            // Get evolution stage emoji
            let evolutionStage = 0;
            if (pet.level >= 15) evolutionStage = 2;
            else if (pet.level >= 5) evolutionStage = 1;
            
            const currentEmoji = getEvolutionEmoji(template, evolutionStage);
            const mood = calculatePetMood(new Date(pet.updatedAt));
            const isSleeping = sleepingPets[pet.id] || false;

            // Simple local Level Progress calculation
            const xpNeeded = Math.floor(50 * Math.pow(1.3, pet.level));
            const xpProgress = Math.min(100, Math.round((pet.xp / xpNeeded) * 100));

            return (
              <motion.div 
                key={pet.id} 
                whileHover={{ y: -2 }}
                className={`rpg-panel rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all ${
                  pet.isEquipped ? 'ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded border border-white/15 bg-black/40 text-purple-300">
                    Lvl {pet.level} {evolutionStage === 2 ? "Elder" : evolutionStage === 1 ? "Adolescent" : "Hatchling"}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${
                      mood === "happy" ? "bg-green-500/10 text-green-400" : mood === "neutral" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {isSleeping ? "Asleep" : mood}
                    </span>
                    {pet.isEquipped && (
                      <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded">
                        Summoned
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 items-center mb-6">
                  <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shadow-inner relative">
                    <span className={`text-4xl select-none ${isSleeping ? "opacity-50" : ""}`}>{currentEmoji}</span>
                    {isSleeping && (
                      <span className="absolute -top-1 -right-1 text-xs animate-bounce">💤</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-serif text-white">{pet.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.name}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {messages[pet.id] && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-4"
                    >
                      {messages[pet.id]}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Permanent Passive Bonus Description */}
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 mb-4 text-xs font-serif text-white/80 flex items-center gap-2">
                  <Shield size={14} className="text-yellow-500 shrink-0" />
                  <span>
                    Passive: +{Math.round((template.bonuses.xpMultiplier - 1) * 100)}% {template.bonuses.statBoost} XP Gain
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Growth Bar */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Exp Level Progress</span>
                      <span>{xpProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-black/40 border border-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] rounded-full transition-all duration-300" style={{ width: `${xpProgress}%` }} />
                    </div>
                  </div>

                  {/* Nourishment Bar */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Nourishment</span>
                      <span>{stats.hunger}%</span>
                    </div>
                    <div className="h-1.5 bg-black/40 border border-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${stats.hunger}%` }} />
                    </div>
                  </div>

                  {/* Joy Bar */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Joy</span>
                      <span>{stats.happiness}%</span>
                    </div>
                    <div className="h-1.5 bg-black/40 border border-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${stats.happiness}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-auto">
                  <button 
                    onClick={() => feedPet.mutate(pet.id)}
                    disabled={feedPet.isPending || stats.hunger >= 100 || isSleeping}
                    className="py-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-white/30 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Utensils size={12} className="text-muted-foreground" /> Feed
                  </button>
                  
                  <button 
                    onClick={() => playPet.mutate(pet.id)}
                    disabled={isSleeping}
                    className="py-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-white/30 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Smile size={12} className="text-muted-foreground" /> Play
                  </button>

                  <button 
                    onClick={() => toggleSleep(pet.id)}
                    className="py-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-white/30 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all"
                  >
                    <Moon size={12} className="text-muted-foreground" /> {isSleeping ? "Wake" : "Sleep"}
                  </button>
                </div>

                <button 
                  onClick={() => equipPet.mutate({ id: pet.id, equip: !pet.isEquipped })}
                  disabled={equipPet.isPending}
                  className={`w-full mt-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                    pet.isEquipped 
                      ? "bg-purple-950/30 border border-purple-500/30 text-purple-300" 
                      : "rpg-btn-primary"
                  }`}
                >
                  <Eye size={12} /> {pet.isEquipped ? "Send to Kennel" : "Summon to Side"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
