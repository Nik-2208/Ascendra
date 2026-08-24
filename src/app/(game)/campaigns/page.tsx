import { auth } from "@/auth";
import { CampaignService } from "@/lib/services/campaign-service";
import { Lock, Map as MapIcon, Target } from "lucide-react";
import { SyncButton } from "./SyncButton";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="p-8 text-center text-slate-400 font-serif">Unauthorized</div>;
  }

  const userId = session.user.id;
  await CampaignService.evaluateAndClaimCampaigns(userId);
  const campaigns = await CampaignService.getCampaignStatuses(userId);

  const { prisma } = await import("@/lib/prisma");
  const character = await prisma.character.findUnique({
    where: { userId },
    select: { level: true }
  });
  const characterLevel = character?.level || 1;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Study": return "text-[#38BDF8] border-[#38BDF8]/40 bg-[#38BDF8]/10";
      case "Fitness": return "text-[#E74C3C] border-[#E74C3C]/40 bg-[#E74C3C]/10";
      case "Mindfulness": return "text-[#2ECC71] border-[#2ECC71]/40 bg-[#2ECC71]/10";
      case "Finance": return "text-[#F4C542] border-[#F4C542]/40 bg-[#F4C542]/10";
      case "Skills": return "text-[#6D5EF8] border-[#6D5EF8]/40 bg-[#6D5EF8]/10";
      default: return "text-slate-300 border-white/10 bg-white/5";
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-[#6D5EF8]/20 border border-[#6D5EF8]/40 text-[#6D5EF8] rounded-full text-xs font-bold uppercase tracking-widest">
            Royal Mission Council
          </span>
          <h1 className="text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[#6D5EF8] drop-shadow-md">
            Long-Term Campaigns & Milestones
          </h1>
          <p className="text-slate-400 text-sm">
            Embark on long-term personal goals composed of weekly milestones and daily objectives.
          </p>
        </div>
        <div className="shrink-0">
          <SyncButton />
        </div>
      </header>

      {characterLevel < 5 ? (
        <GlassSurface glow="purple" className="p-16 text-center flex flex-col items-center justify-center h-64">
          <MapIcon className="text-slate-600 mb-3" size={40} />
          <h3 className="text-xl font-serif font-bold text-white">Campaigns Locked</h3>
          <p className="text-xs text-slate-400 mt-1">Reach Hero Level 5 to unlock long-term campaigns. (Your Current Level: {characterLevel})</p>
        </GlassSurface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {campaigns.map((camp) => {
            const isUnlocked = camp.isUnlocked;
            const isCompleted = camp.isCompleted;

            return (
              <SpotlightCard
                key={camp.id}
                className={`p-6 flex flex-col justify-between ${
                  isCompleted ? "border-[#2ECC71]/40" : isUnlocked ? "border-[#6D5EF8]/40" : "opacity-50"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shrink-0 ${
                      isCompleted
                        ? "bg-[#2ECC71]/20 border-[#2ECC71] text-[#2ECC71]"
                        : isUnlocked
                        ? "bg-[#6D5EF8]/20 border-[#6D5EF8] text-[#6D5EF8]"
                        : "bg-slate-950 border-white/10 text-slate-600"
                    }`}>
                      {isCompleted ? "🏆" : isUnlocked ? camp.icon : <Lock size={20} />}
                    </div>

                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-serif font-bold text-lg text-white">
                          {camp.name}
                        </h4>
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getCategoryColor(camp.category)}`}>
                          {camp.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {camp.description}
                      </p>
                    </div>
                  </div>

                  {isUnlocked && (
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Milestone Progress ({camp.currentValue} / {camp.targetValue})</span>
                        <span className={isCompleted ? "text-[#2ECC71]" : "text-[#6D5EF8]"}>
                          {camp.progressPercent}%
                        </span>
                      </div>
                      <div className="h-3 bg-slate-950 border border-white/10 rounded-full overflow-hidden w-full">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? "bg-[#2ECC71]" : "bg-[#6D5EF8]"
                          }`}
                          style={{ width: `${camp.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
