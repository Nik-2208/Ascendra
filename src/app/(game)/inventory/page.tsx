"use client";

import { motion } from "framer-motion";
import { Backpack, Box, Sword, Heart, Trophy, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventory, equipItemAction, consumeItemAction, sellItemAction, openChestAction } from "@/actions/inventory-actions";
import { getDashboardData } from "@/actions/dashboard-actions";
import { soundEngine } from "@/lib/sound-engine";
import { SKILL_NODES } from "@/lib/skill-engine";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SpecularButton } from "@/components/ui/specular-button";

const INVENTORY_CATEGORIES = [
  { id: "all", label: "All Items", icon: Backpack },
  { id: "equipment", label: "Equipment", icon: Sword },
  { id: "consumable", label: "Consumables", icon: Heart },
  { id: "materials", label: "Materials", icon: Box },
  { id: "skills", label: "Unlocked Skills", icon: Trophy }
];

function getItemEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("sword") || n.includes("blade")) return "⚔️";
  if (n.includes("shield")) return "🛡️";
  if (n.includes("elixir") || n.includes("potion")) return "🧪";
  if (n.includes("wooden chest")) return "📦";
  if (n.includes("golden chest")) return "🎁";
  if (n.includes("legendary chest")) return "👑";
  if (n.includes("ore")) return "🪨";
  if (n.includes("key")) return "🗝️";
  return "🏆";
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { data: inventoryData, isLoading: isInvLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => getInventory(),
  });

  const { data: dashboard, isLoading: isDashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const rawItems = inventoryData?.items || [];
  const profile = dashboard?.profile;

  const unlockedSkills = (profile as any)?.skills?.map((s: any) => s.skillNodeId) || [];

  const equipMutation = useMutation({
    mutationFn: ({ id, equip }: { id: string; equip: boolean }) => equipItemAction(id, equip),
    onSuccess: () => {
      soundEngine.playLevelUp();
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const consumeMutation = useMutation({
    mutationFn: consumeItemAction,
    onSuccess: (res) => {
      soundEngine.playQuestComplete();
      alert(res.effectMessage || "Item consumed successfully.");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const sellMutation = useMutation({
    mutationFn: sellItemAction,
    onSuccess: (res) => {
      soundEngine.playQuestComplete();
      alert(`Item sold! Earned +${res.sellPrice} Gold.`);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const filteredItems = rawItems.filter((invItem: any) => {
    if (activeTab === "all") return true;
    const type = invItem.item?.type?.toLowerCase() || "";
    if (activeTab === "equipment") return type === "equipment";
    if (activeTab === "consumable") return type === "consumable";
    if (activeTab === "materials") return type === "material" || type === "cosmetic";
    return true;
  });

  if (isInvLoading || isDashLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#6D5EF8] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(109,94,248,0.5)]" />
      </div>
    );
  }

  const selectedInvItem = rawItems.find((i: any) => i.id === selectedItemId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 max-w-6xl mx-auto"
    >
      <header className="space-y-2">
        <span className="px-3 py-1 bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 text-[#6D5EF8] rounded-full text-xs font-bold uppercase tracking-widest">
          Hero's Backpack
        </span>
        <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[#6D5EF8] drop-shadow-md">
          Inventory & Gear Management
        </h1>
        <p className="text-slate-400 text-sm">
          Inspect collected weapons, armors, consumables, artifacts, and active passives.
        </p>
      </header>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
        {INVENTORY_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                setSelectedItemId(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                isActive
                  ? "bg-[#6D5EF8] text-white border-white/30 shadow-[0_0_15px_rgba(109,94,248,0.4)]"
                  : "bg-slate-900/60 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Item Slot Grid */}
        <div className="lg:col-span-8">
          {activeTab === "skills" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SKILL_NODES.filter((node) => unlockedSkills.includes(node.id)).map((node) => {
                let buildingsObj: any = (profile as any)?.buildings || {};
                if (typeof buildingsObj === "string") {
                  try { buildingsObj = JSON.parse(buildingsObj); } catch (e) { buildingsObj = {}; }
                }
                const activeSkillIds = new Set<string>(buildingsObj.activeSkillIds || unlockedSkills);
                const isEnabled = activeSkillIds.has(node.id);

                return (
                  <SpotlightCard
                    key={node.id}
                    className={`p-4 flex items-center justify-between gap-3 border transition-all ${
                      isEnabled ? "border-emerald-500/40 bg-emerald-950/20" : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{node.icon}</span>
                      <div>
                        <h4 className="text-base font-bold font-serif text-white">{node.name}</h4>
                        <p className="text-xs text-slate-400">{node.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const { toggleSkillAction } = await import("@/actions/game-actions");
                        const res = await toggleSkillAction(node.id);
                        if (res?.success) {
                          soundEngine.playQuestComplete();
                          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                          queryClient.invalidateQueries({ queryKey: ["inventory"] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                        isEnabled
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {isEnabled ? "ACTIVE" : "DISABLED"}
                    </button>
                  </SpotlightCard>
                );
              })}
            </div>
          ) : filteredItems.length === 0 ? (
            <GlassSurface className="p-16 text-center flex flex-col items-center justify-center">
              <Backpack className="w-16 h-16 text-slate-600 mb-3" />
              <p className="text-base font-serif font-bold text-white">Backpack is Empty</p>
              <p className="text-xs text-slate-400 mt-1">Acquire items through quest rewards, boss battles, or the Marketplace.</p>
            </GlassSurface>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredItems.map((invItem: any) => {
                const item = invItem.item;
                const isSelected = selectedItemId === invItem.id;

                return (
                  <button
                    key={invItem.id}
                    onClick={() => setSelectedItemId(invItem.id)}
                    className={`aspect-square rounded-2xl bg-slate-900/80 border p-2 flex flex-col items-center justify-center relative transition-all duration-200 group ${
                      isSelected
                        ? "border-[#6D5EF8] ring-2 ring-[#6D5EF8]/40 shadow-[0_0_20px_rgba(109,94,248,0.4)]"
                        : "border-white/10 hover:border-white/30 hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{getItemEmoji(item.name)}</span>
                    <span className="text-[10px] font-serif font-bold text-white mt-1 truncate w-full text-center">{item.name}</span>
                    {invItem.quantity > 1 && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-slate-950/80 border border-white/10 text-[9px] font-mono text-[#F4C542]">
                        x{invItem.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Item Inspector Panel */}
        <div className="lg:col-span-4">
          {selectedInvItem ? (
            <GlassSurface glow="purple" className="p-6 space-y-4">
              <div className="text-center pb-4 border-b border-white/10">
                <span className="text-5xl block mb-2">{getItemEmoji(selectedInvItem.item.name)}</span>
                <h3 className="text-xl font-bold font-serif text-white">{selectedInvItem.item.name}</h3>
                <span className="text-xs text-[#38BDF8] font-bold uppercase tracking-wider">{selectedInvItem.item.rarity || "Common"} {selectedInvItem.item.type}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedInvItem.item.description || "A functional item in your hero's backpack."}
              </p>

              <div className="space-y-2 pt-2">
                {selectedInvItem.item.type === "EQUIPMENT" && (
                  <SpecularButton
                    variant="primary"
                    size="sm"
                    onClick={() => equipMutation.mutate({ id: selectedInvItem.id, equip: !selectedInvItem.isEquipped })}
                    className="w-full"
                  >
                    <Sword size={14} /> {selectedInvItem.isEquipped ? "Unequip Item" : "Equip Item"}
                  </SpecularButton>
                )}

                {selectedInvItem.item.type === "CONSUMABLE" && (
                  <SpecularButton
                    variant="secondary"
                    size="sm"
                    onClick={() => consumeMutation.mutate(selectedInvItem.id)}
                    className="w-full"
                  >
                    <Heart size={14} /> Use Consumable
                  </SpecularButton>
                )}

                <SpecularButton
                  variant="gold"
                  size="sm"
                  onClick={() => sellMutation.mutate(selectedInvItem.id)}
                  className="w-full"
                >
                  Sell for GP
                </SpecularButton>
              </div>
            </GlassSurface>
          ) : (
            <GlassSurface className="p-8 text-center flex flex-col items-center justify-center">
              <Box className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-serif text-white font-bold">Select an Item</p>
              <p className="text-xs text-slate-400 mt-1">Click any item slot in your backpack grid to view stats & actions.</p>
            </GlassSurface>
          )}
        </div>
      </div>
    </motion.div>
  );
}
