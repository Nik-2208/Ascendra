"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getShopItems, purchaseItemAction } from "@/actions/shop-actions";
import { getDashboardData } from "@/actions/dashboard-actions";
import { Store, Coins, PackageOpen, Hourglass, ShoppingBag } from "lucide-react";
import { soundEngine } from "@/lib/sound-engine";
import { motion } from "framer-motion";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SpecularButton } from "@/components/ui/specular-button";

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
  return "🏷️";
}

export default function ShopPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const { data: shopData, isLoading, refetch } = useQuery({
    queryKey: ["shopItems"],
    queryFn: () => getShopItems(),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const purchaseItem = useMutation({
    mutationFn: purchaseItemAction,
    onSuccess: (result, itemId) => {
      const res = result as {
        success: boolean;
        data?: {
          purchasedItem?: string;
          remainingCoins?: number;
        };
        error?: string;
      };
      if (res.success) {
        soundEngine.playQuestComplete();
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("REWARD_PURCHASED", { 
            reward: { id: itemId, cost: 0, currency: "coins" }, 
            itemName: res.data?.purchasedItem,
            userId: userId || "" 
          });
        });
        alert(`Successfully purchased ${res.data?.purchasedItem}!`);
      } else {
        alert(res.error);
      }
    }
  });

  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!shopData?.nextRefreshAt) return;

    const interval = setInterval(() => {
      const msLeft = new Date(shopData.nextRefreshAt).getTime() - Date.now();
      if (msLeft <= 0) {
        clearInterval(interval);
        setTimeLeft("00:00:00");
        refetch();
      } else {
        const hours = Math.floor(msLeft / 3600000);
        const mins = Math.floor((msLeft % 3600000) / 60000);
        const secs = Math.floor((msLeft % 60000) / 1000);
        setTimeLeft(
          `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shopData?.nextRefreshAt, refetch]);

  const items = shopData?.items || [];
  const userCoins = dashboard?.moneyJar?.coins || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 max-w-6xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-[#F4C542]/20 border border-[#F4C542]/40 text-[#F4C542] rounded-full text-xs font-bold uppercase tracking-widest">
            Grand Marketplace
          </span>
          <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-[#F4C542] drop-shadow-md mt-2">
            Kingdom Merchant Store
          </h1>
          <p className="text-slate-400 text-sm">
            Trade your earned gold for weapons, armor, consumables, and loot chests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
            <Hourglass size={14} className="text-[#F4C542] animate-spin" />
            <span>Restock in: <strong className="text-white font-bold">{timeLeft || "--:--:--"}</strong></span>
          </div>

          <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-[#F4C542]/40 text-[#F4C542] font-bold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(244,197,66,0.15)]">
            <Coins size={18} />
            <span>{userCoins} GP</span>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#F4C542] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(244,197,66,0.5)]" />
        </div>
      ) : items.length === 0 ? (
        <GlassSurface glow="gold" className="p-16 text-center flex flex-col items-center justify-center">
          <PackageOpen className="w-16 h-16 text-slate-600 mb-3" />
          <p className="text-base font-serif font-bold text-white">Merchant Restocking</p>
          <p className="text-xs text-slate-400 mt-1">The marketplace shelves are currently empty. Return after the next restock timer!</p>
        </GlassSurface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item: any) => {
            const canAfford = userCoins >= item.value;

            return (
              <SpotlightCard key={item.id} className="p-6 flex flex-col items-center text-center justify-between">
                <div>
                  <span className="text-5xl block mb-3">{getItemEmoji(item.name)}</span>
                  <h3 className="text-lg font-black font-serif text-white">{item.name}</h3>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-2">{item.description}</p>
                </div>

                <div className="w-full mt-6 space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-center gap-1.5 text-[#F4C542] font-bold font-mono text-sm">
                    <Coins size={16} /> {item.value} GP
                  </div>

                  <SpecularButton
                    variant={canAfford ? "gold" : "ghost"}
                    size="sm"
                    onClick={() => purchaseItem.mutate(item.id)}
                    disabled={!canAfford || purchaseItem.isPending}
                    className="w-full"
                  >
                    <ShoppingBag size={14} /> {canAfford ? "Purchase Item" : "Insufficient GP"}
                  </SpecularButton>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
