"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSkillProgressionAction, unlockSkillNodeAction, toggleSkillAction } from "@/actions/game-actions";
import { SKILL_NODES, type SkillNode, canUnlockNode } from "@/lib/skill-engine";
import { soundEngine } from "@/lib/sound-engine";
import { 
  Sparkles, 
  Lock, 
  Unlock, 
  Check, 
  Zap, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  ShieldCheck, 
  Flame, 
  Swords, 
  Brain, 
  Coins, 
  Trophy, 
  Compass, 
  Building2, 
  Target, 
  BookOpen, 
  Crown,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassSurface } from "@/components/ui/glass-surface";

interface NodePosition {
  x: number;
  y: number;
}

// Compute radial tree layout around Hero Core (0,0)
const CATEGORY_ANGLES: Record<string, number> = {
  knowledge: 0,
  strength: 30,
  discipline: 60,
  health: 90,
  finance: 120,
  general: 150,
  focus: 180,
  village: 210,
  campaign: 240,
  leadership: 270,
  ascension: 300,
  legendary: 330
};

const CATEGORY_COLORS: Record<string, { main: string; glow: string; text: string }> = {
  knowledge: { main: "from-purple-500 to-indigo-500", glow: "rgba(168,85,247,0.5)", text: "text-purple-300" },
  strength: { main: "from-orange-500 to-amber-500", glow: "rgba(249,115,22,0.5)", text: "text-orange-300" },
  discipline: { main: "from-blue-500 to-cyan-500", glow: "rgba(59,130,246,0.5)", text: "text-blue-300" },
  health: { main: "from-rose-500 to-red-500", glow: "rgba(244,63,94,0.5)", text: "text-rose-300" },
  finance: { main: "from-yellow-400 to-amber-500", glow: "rgba(250,204,21,0.5)", text: "text-amber-300" },
  general: { main: "from-emerald-400 to-teal-500", glow: "rgba(52,211,153,0.5)", text: "text-emerald-300" }
};

export default function SkillTreePage() {
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ["skillProgression"],
    queryFn: () => getSkillProgressionAction(),
  });

  const unlockMutation = useMutation({
    mutationFn: (nodeId: string) => unlockSkillNodeAction(nodeId),
    onSuccess: (res: any, nodeId) => {
      if (res?.success) {
        soundEngine.playQuestComplete();
        import("canvas-confetti").then((m) => m.default({ particleCount: 50, spread: 60 }));
        queryClient.invalidateQueries({ queryKey: ["skillProgression"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        alert(res?.error || "Failed to unlock skill");
      }
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (nodeId: string) => toggleSkillAction(nodeId),
    onSuccess: (res: any) => {
      if (res?.success) {
        soundEngine.playQuestComplete();
        queryClient.invalidateQueries({ queryKey: ["skillProgression"] });
        queryClient.invalidateQueries({ queryKey: ["character"] });
      }
    }
  });

  const data = response?.success ? response.data : null;
  const unlockedIds = useMemo(() => new Set<string>(data?.unlockedIds || []), [data?.unlockedIds]);
  const activeIds = useMemo(() => new Set<string>(data?.activeIds || []), [data?.activeIds]);
  const availablePoints = data?.totalAvailablePoints ?? 0;
  const currentLevel = data?.currentLevel ?? 1;

  // Calculate Node Positions on radial canvas
  const nodePositions = useMemo(() => {
    const map = new Map<string, NodePosition>();
    SKILL_NODES.forEach((node, idx) => {
      const angle = (CATEGORY_ANGLES[node.tree] || (idx * 30)) * (Math.PI / 180);
      const radius = 180 + (node.tier - 1) * 140;
      map.set(node.id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    });
    return map;
  }, []);

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetCamera = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[650px] overflow-hidden rounded-3xl bg-slate-950 border border-white/10 select-none">
      
      {/* Background Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Card: Available Skill Points */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
        <GlassSurface glow="gold" className="px-6 py-3 border-amber-500/40 bg-slate-950/80 flex items-center gap-3">
          <Sparkles className="text-amber-400 animate-spin-slow" size={24} />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block">Available Skill Points</span>
            <span className="text-2xl font-mono font-black text-amber-300">⭐ {availablePoints}</span>
          </div>
        </GlassSurface>
      </div>

      {/* Camera Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-slate-900/80 border border-white/10 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"><ZoomIn size={18} /></button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"><ZoomOut size={18} /></button>
        <button onClick={resetCamera} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Maximize2 size={18} /></button>
      </div>

      {/* Interactive Visual Node Graph Canvas */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative overflow-hidden"
      >
        <div 
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 0.1s ease-out" 
          }}
          className="relative w-0 h-0 flex items-center justify-center"
        >
          {/* SVG Connection Lines */}
          <svg className="absolute overflow-visible pointer-events-none" style={{ width: "2000px", height: "2000px", left: "-1000px", top: "-1000px" }}>
            {SKILL_NODES.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;

              // Connections from parent to child
              return node.prerequisites.map((preId) => {
                const parentPos = nodePositions.get(preId);
                if (!parentPos) return null;

                const isUnlocked = unlockedIds.has(node.id) && unlockedIds.has(preId);
                return (
                  <line
                    key={`${preId}-${node.id}`}
                    x1={1000 + parentPos.x}
                    y1={1000 + parentPos.y}
                    x2={1000 + pos.x}
                    y2={1000 + pos.y}
                    stroke={isUnlocked ? "#f59e0b" : "#334155"}
                    strokeWidth={isUnlocked ? "3" : "1.5"}
                    strokeDasharray={isUnlocked ? "none" : "4,4"}
                    className={isUnlocked ? "shadow-[0_0_10px_rgba(245,158,11,0.8)]" : "opacity-40"}
                  />
                );
              });
            })}

            {/* Lines from Hero Core (0,0) to Tier 1 Nodes */}
            {SKILL_NODES.filter(n => n.tier === 1).map(node => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;
              const isUnlocked = unlockedIds.has(node.id);
              return (
                <line
                  key={`core-${node.id}`}
                  x1={1000}
                  y1={1000}
                  x2={1000 + pos.x}
                  y2={1000 + pos.y}
                  stroke={isUnlocked ? "#a855f7" : "#475569"}
                  strokeWidth={isUnlocked ? "3" : "1.5"}
                  className={isUnlocked ? "shadow-[0_0_12px_rgba(168,85,247,0.8)]" : "opacity-40"}
                />
              );
            })}
          </svg>

          {/* Central Hero Core Node */}
          <motion.div 
            onClick={resetCamera}
            whileHover={{ scale: 1.1 }}
            className="absolute z-10 w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 via-amber-500 to-indigo-600 p-1 shadow-[0_0_50px_rgba(168,85,247,0.6)] cursor-pointer flex items-center justify-center animate-pulse"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-center p-2">
              <span className="text-xl">🧙‍♂️</span>
              <span className="text-[10px] font-black text-amber-300 font-mono tracking-tighter">HERO CORE</span>
              <span className="text-[9px] font-mono text-purple-300">Lvl {currentLevel}</span>
            </div>
          </motion.div>

          {/* Skill Nodes */}
          {SKILL_NODES.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const isUnlocked = unlockedIds.has(node.id);
            const isActive = activeIds.has(node.id);
            const canUnlock = canUnlockNode(node, unlockedIds, availablePoints, currentLevel);
            const cfg = CATEGORY_COLORS[node.tree] || CATEGORY_COLORS.general;

            return (
              <motion.div
                key={node.id}
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                onClick={() => setSelectedNode(node)}
                whileHover={{ scale: 1.2 }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl cursor-pointer p-0.5 transition-all shadow-xl flex items-center justify-center ${
                  isUnlocked
                    ? `bg-gradient-to-br ${cfg.main} shadow-[0_0_20px_${cfg.glow}]`
                    : canUnlock
                    ? "bg-amber-500/80 animate-bounce shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                    : "bg-slate-900 border border-white/10 opacity-60"
                }`}
              >
                <div className="w-full h-full rounded-[14px] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-lg">{node.icon}</span>
                  {isUnlocked && (
                    <span className={`absolute bottom-0.5 text-[8px] font-bold font-mono ${isActive ? "text-emerald-400" : "text-slate-500"}`}>
                      {isActive ? "ON" : "OFF"}
                    </span>
                  )}
                  {!isUnlocked && (
                    <span className="absolute top-1 right-1 text-[8px] font-bold font-mono text-amber-300">
                      ⭐{node.cost}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Slide-Over Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute top-0 right-0 bottom-0 w-96 bg-slate-950/95 border-l border-white/10 p-6 z-30 shadow-2xl backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl">
                    {selectedNode.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-serif text-white">{selectedNode.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">{selectedNode.tree} • Tier {selectedNode.tier}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.description}</p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/5">
                  <span className="text-slate-400">Unlock Cost</span>
                  <span className="text-amber-300 font-bold">⭐ {selectedNode.cost} Skill Points</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/5">
                  <span className="text-slate-400">Required Level</span>
                  <span className="text-purple-300 font-bold">Level {selectedNode.requiredLevel}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              {unlockedIds.has(selectedNode.id) ? (
                <div className="space-y-2">
                  <button
                    onClick={() => toggleMutation.mutate(selectedNode.id)}
                    disabled={toggleMutation.isPending}
                    className={`w-full py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all ${
                      activeIds.has(selectedNode.id)
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {activeIds.has(selectedNode.id) ? "✓ Skill Active (Enabled)" : "Skill Disabled (Enable)"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => unlockMutation.mutate(selectedNode.id)}
                  disabled={!canUnlockNode(selectedNode, unlockedIds, availablePoints, currentLevel) || unlockMutation.isPending}
                  className={`w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-xl ${
                    canUnlockNode(selectedNode, unlockedIds, availablePoints, currentLevel)
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:opacity-90 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse"
                      : "bg-slate-900 border border-white/10 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {unlockMutation.isPending ? "Unlocking..." : `Unlock Node (⭐ ${selectedNode.cost})`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
