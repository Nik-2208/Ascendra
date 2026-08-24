"use client";

import { useTransition } from "react";
import { forceReevaluateCampaignsAction } from "@/actions/campaign-actions";
import { playSound } from "@/lib/sound-engine";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    playSound("click");
    startTransition(async () => {
      const res = await forceReevaluateCampaignsAction();
      if (res.success) {
        playSound("quest_complete");
      } else {
        playSound("error");
      }
    });
  };

  return (
    <button
      onClick={handleSync}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-600/20"
    >
      <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Syncing..." : "Sync Progress"}
    </button>
  );
}
