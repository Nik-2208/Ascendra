"use client";

import { useQuery } from "@tanstack/react-query";
import { getCharacterProfile } from "@/actions/character-actions";
import { 
  User, 
  Shield, 
  Sword, 
  Brain, 
  Activity, 
  Target, 
  Zap, 
  Flame, 
  BookOpen, 
  Heart, 
  Sparkles, 
  Compass, 
  Award, 
  TrendingUp,
  MessageSquare,
  Palette
} from "lucide-react";
import { gameMath } from "@/lib/game-math";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";

interface AttributeData {
  level: number;
  xp: number;
  xpForNextLevel: number;
  lifetimeXP: number;
  progressPercent: number;
}

const STAT_CONFIG: Record<string, { label: string; icon: any; color: string; glowColor: string }> = {
  strength: { label: "Strength", icon: Sword, color: "from-orange-500 to-amber-500", glowColor: "rgba(249,115,22,0.4)" },
  intelligence: { label: "Intelligence", icon: Brain, color: "from-purple-500 to-indigo-500", glowColor: "rgba(168,85,247,0.4)" },
  discipline: { label: "Discipline", icon: Shield, color: "from-blue-500 to-cyan-500", glowColor: "rgba(59,130,246,0.4)" },
  focus: { label: "Focus", icon: Target, color: "from-[#6D5EF8] to-purple-400", glowColor: "rgba(109,94,248,0.4)" },
  wisdom: { label: "Wisdom", icon: BookOpen, color: "from-emerald-500 to-teal-400", glowColor: "rgba(16,185,129,0.4)" },
  health: { label: "Health", icon: Heart, color: "from-rose-500 to-red-400", glowColor: "rgba(244,63,94,0.4)" },
  resilience: { label: "Resilience", icon: Flame, color: "from-amber-500 to-orange-400", glowColor: "rgba(245,158,11,0.4)" },
  creativity: { label: "Creativity", icon: Palette, color: "from-pink-500 to-rose-400", glowColor: "rgba(236,72,153,0.4)" },
  charisma: { label: "Charisma", icon: MessageSquare, color: "from-yellow-400 to-amber-300", glowColor: "rgba(250,204,21,0.4)" },
  productivity: { label: "Productivity", icon: Zap, color: "from-cyan-400 to-blue-500", glowColor: "rgba(34,211,238,0.4)" }
};

export default function CharacterPage() {
  const { data: character, isLoading } = useQuery({
    queryKey: ["character"],
    queryFn: () => getCharacterProfile(),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
      </div>
    );
  }

  if (!character) {
    return <div className="text-center text-slate-400 p-10">Character profile not initialized.</div>;
  }

  const attrs: Record<string, any> = character.heroAttributes || {};
  const stats = character.stats || { strength: 10, defense: 10, intelligence: 10, agility: 10, luck: 10, hp: 100, maxHp: 100 };
  const xpProgress = gameMath.levelProgress(character.xp).percentage;

  // Compute Top Strengths & Weakness
  const sortedStats = Object.keys(STAT_CONFIG).map(key => ({
    key,
    ...STAT_CONFIG[key],
    data: attrs[key] || { level: 1, xp: 0, xpForNextLevel: 50, lifetimeXP: 0, progressPercent: 0 }
  })).sort((a, b) => b.data.level - a.data.level || b.data.lifetimeXP - a.data.lifetimeXP);

  const topStrengths = sortedStats.slice(0, 3);
  const weakest = sortedStats[sortedStats.length - 1];

  // Compute Overall Hero Rating
  const totalAttrLevels = sortedStats.reduce((acc, curr) => acc + curr.data.level, 0);
  const heroRating = Math.round((totalAttrLevels / 10) * 10 + character.level * 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full text-xs font-bold uppercase tracking-widest">
            Hero Profile & Persona
          </span>
          <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 drop-shadow-md mt-2">
            Independent Hero Attributes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Every task, workout, study block, and boss victory directly shapes your 10 core attributes.
          </p>
        </div>

        <GlassSurface glow="purple" className="p-4 flex items-center gap-4 bg-slate-950/60 border-purple-500/30">
          <Award className="w-8 h-8 text-amber-400 animate-pulse" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-300 block">Overall Rating</span>
            <span className="text-2xl font-mono font-black text-amber-300">{heroRating} Rating</span>
          </div>
        </GlassSurface>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Avatar & Character Overview */}
        <div className="lg:col-span-4 space-y-6">
          <SpotlightCard className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-slate-950/90 border-white/10">
            <div className="w-36 h-36 rounded-full border-2 border-purple-500/40 bg-black/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_35px_rgba(168,85,247,0.3)] relative mb-6">
              <div className="text-7xl">🧙‍♂️</div>
            </div>

            <h2 className="text-3xl font-bold font-serif text-white">{character.name || "Hero"}</h2>
            <p className="text-purple-400 font-bold tracking-widest uppercase text-xs mt-1">{character.class}</p>

            <div className="w-full mt-6 space-y-4 text-left border-t border-white/10 pt-4">
              {/* HP Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-rose-400">Health Points</span>
                  <span className="text-slate-300 font-mono">{stats.hp} / {stats.maxHp}</span>
                </div>
                <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)] transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.hp / stats.maxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Character Level Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-purple-300">Level {character.level}</span>
                  <span className="text-slate-300 font-mono">{Math.round(xpProgress)}%</span>
                </div>
                <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)] transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Top Strengths & Suggested Improvement */}
          <div className="rpg-panel rounded-3xl p-6 border border-white/10 space-y-4 bg-slate-900/60">
            <h3 className="text-sm font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> Top Hero Strengths
            </h3>
            
            <div className="space-y-2">
              {topStrengths.map((str, idx) => {
                const IconComponent = str.icon;
                return (
                  <div key={str.key} className="flex items-center justify-between p-3 bg-slate-950/70 border border-white/10 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-amber-400 font-bold font-mono">#{idx + 1}</span>
                      <IconComponent size={14} className="text-purple-400" />
                      <span className="font-bold text-white">{str.label}</span>
                    </div>
                    <span className="font-bold font-mono text-purple-300">Lvl {str.data.level}</span>
                  </div>
                );
              })}
            </div>

            {weakest && (
              <div className="bg-purple-950/30 border border-purple-500/30 p-4 rounded-2xl space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-purple-300 block">Suggested Training</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Your weakest attribute is <strong className="text-amber-300 uppercase">{weakest.label} (Lvl {weakest.data.level})</strong>. Complete tasks in this category to round out your Hero Persona.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 10 Independent Attributes Grid */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Activity className="text-purple-400" size={20} /> 10 Core Hero Attributes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(STAT_CONFIG).map((key) => {
              const cfg = STAT_CONFIG[key];
              const IconComp = cfg.icon;
              const data: AttributeData = attrs[key] || { level: 1, xp: 0, xpForNextLevel: 50, lifetimeXP: 0, progressPercent: 0 };

              return (
                <div key={key} className="p-4 bg-slate-950/80 border border-white/10 rounded-2xl space-y-3 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <IconComp size={18} className="text-purple-300" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white font-serif">{cfg.label}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Lifetime XP: {data.lifetimeXP}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono block">Lvl {data.level}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{data.xp} / {data.xpForNextLevel} XP</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full bg-gradient-to-r ${cfg.color} rounded-full transition-all duration-700`}
                        style={{ width: `${data.progressPercent}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-right font-mono text-slate-400">{data.progressPercent}% to next level</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
