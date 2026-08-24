"use client";

import { useState, useEffect } from "react";
import { Coins, Gift, Gem, Lock, Sparkles, Shield, Zap } from "lucide-react";
import { useCharacterStore } from "@/stores/character-store";
import { soundEngine } from "@/lib/sound-engine";
import { useSession } from "next-auth/react";
import { SHOP_ITEMS, type ShopItem } from "@/lib/economy-engine";
import { getRarityColor } from "@/lib/loot-engine";
import { buyShopItemAction } from "@/actions/game-actions";
import { useQueryClient } from "@tanstack/react-query";

export default function RewardsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { profile } = useCharacterStore();
  const [activeCategory, setActiveCategory] = useState<ShopItem["category"]>("gear");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const coins = profile?.coins || 0;
  const gems = profile?.gems || 0;
  const playerLevel = profile?.level || 1;

  const filteredItems = SHOP_ITEMS.filter((item) => {
    if (activeCategory === "gear") return item.category === "gear";
    if (activeCategory === "consumable") return item.category === "consumable" || item.category === "utility";
    return item.category === "real_reward";
  });

  const queryClient = useQueryClient();

  const handlePurchase = async (item: ShopItem) => {
    if (!user?.id) return;

    // Client-side validation checks
    if (playerLevel < item.requiredLevel) {
      alert(`Requires Level ${item.requiredLevel}`);
      return;
    }

    if (item.currency === "coins" && coins < item.cost) {
      alert("Insufficient coins");
      return;
    }

    if (item.currency === "gems" && gems < item.cost) {
      alert("Insufficient gems");
      return;
    }

    setPurchasingId(item.id);
    soundEngine.playCoinSpend();

    try {
      const result = await buyShopItemAction(user.id!, item.id);

      if (result.success) {
        // Trigger game event for real-time propagation
        const { dispatchGameEvent } = await import("@/lib/game-event-bus");
        await dispatchGameEvent("REWARD_PURCHASED", { reward: item, userId: user.id! });

        // Force reload character store and react query cache
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        
        const { useCharacterStore } = await import("@/stores/character-store");
        await useCharacterStore.getState().loadProfile(user.id!);
      } else {
        alert("error" in result ? (result.error as string) : "Failed to purchase item");
      }
    } catch (err) {
      console.error(err);
      alert("Error purchasing item");
    } finally {
      setPurchasingId(null);
    }
  };

  const categories: { id: ShopItem["category"] | "consumable"; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "gear", label: "Gear & Artifacts", icon: Shield },
    { id: "consumable", label: "Consumables", icon: Zap },
    { id: "real_reward", label: "Real Rewards", icon: Gift },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-xp-gold to-yellow-500 flex items-center gap-3">
            <Gift className="text-xp-gold animate-bounce" size={36} /> RPG Shop & Rewards
          </h1>
          <p className="text-muted-foreground mt-1">Acquire powerful gear, status boosters, and guilt-free real-life rewards.</p>
        </div>

        {/* Currencies Hud */}
        <div className="flex gap-4 self-start sm:self-auto">
          <div className="rpg-panel px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-[0_0_15px_rgba(255,200,0,0.05)] bg-black/40">
            <Coins size={20} className="text-xp-gold" />
            <span className="font-serif font-bold text-xl text-yellow-400">{coins}</span>
          </div>
          <div className="rpg-panel px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-[0_0_15px_rgba(168,85,247,0.05)] bg-black/40">
            <Gem size={20} className="text-accent" />
            <span className="font-serif font-bold text-xl text-purple-300">{gems}</span>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex p-1 bg-card border border-border rounded-xl overflow-x-auto hide-scrollbar max-w-lg">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as ShopItem["category"])}
              className={`flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Shop Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isLevelLocked = playerLevel < item.requiredLevel;
          const canAffordItem = item.currency === "coins" ? coins >= item.cost : gems >= item.cost;
          const isPurchasing = purchasingId === item.id;
          const borderStyle = item.generatesItem ? { borderColor: `${getRarityColor(item.generatesItem.rarity)}40` } : {};

          return (
            <div
              key={item.id}
              style={borderStyle}
              className={`rpg-panel rpg-panel-interactive rounded-2xl p-6 flex flex-col relative overflow-hidden group border-white/10 transition-all ${
                isLevelLocked ? "opacity-75" : ""
              }`}
            >
              {/* Background Rarity Glow (Only for Gear) */}
              {item.generatesItem && (
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{ backgroundColor: getRarityColor(item.generatesItem.rarity) }}
                />
              )}

              {/* Locked overlay */}
              {isLevelLocked && (
                <div className="absolute top-3 right-3 bg-black/60 border border-white/10 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1.5 z-20">
                  <Lock size={10} /> Lvl {item.requiredLevel}
                </div>
              )}

              {/* Title & Icon */}
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black/50 border border-border/40 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                  {item.icon}
                </div>
                <div>
                  <h3
                    className="font-bold text-lg leading-tight"
                    style={{ color: item.generatesItem ? getRarityColor(item.generatesItem.rarity) : "inherit" }}
                  >
                    {item.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mt-1 block">
                    {item.generatesItem ? `${item.generatesItem.rarity} ${item.generatesItem.slot}` : item.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed italic">{item.description}</p>

              {/* Item stats/effects display */}
              {item.generatesItem && (
                <div className="space-y-1.5 mb-6 border-t border-border/30 pt-3 relative z-10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                    Equipment Stats
                  </span>
                  {Object.entries(item.generatesItem.stats).map(([stat, val]) => (
                    <div key={stat} className="text-xs flex justify-between">
                      <span className="text-muted-foreground capitalize">{stat}</span>
                      <span className="font-bold text-foreground">+{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {item.effect && (
                <div className="mb-6 border-t border-border/30 pt-3 relative z-10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                    Consumable Effect
                  </span>
                  <div className="text-xs text-success font-medium flex items-center gap-1.5">
                    <Sparkles size={12} className="animate-spin-slow" />
                    {item.effect.type === "xp_boost" && `Grants +${item.effect.value} XP instantly`}
                    {item.effect.type === "skill_reset" && `Resets all spent skill tree points`}
                    {item.effect.type === "coin_boost" && `Multiplier: x${item.effect.value} for ${item.effect.duration} mins`}
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={() => handlePurchase(item)}
                disabled={isLevelLocked || !canAffordItem || isPurchasing}
                className={`mt-auto w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all uppercase tracking-widest text-xs border ${
                  isLevelLocked
                    ? "bg-black/20 text-muted-foreground/40 border-border/40 cursor-not-allowed"
                    : !canAffordItem
                    ? "bg-black/30 text-muted-foreground border-border/60 hover:border-red-500/30 hover:text-red-400"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                }`}
              >
                {isLevelLocked ? (
                  <>
                    <Lock size={12} /> Locked (Lvl {item.requiredLevel})
                  </>
                ) : (
                  <>
                    {item.currency === "coins" ? <Coins size={14} /> : <Gem size={14} />}
                    Buy for {item.cost}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
