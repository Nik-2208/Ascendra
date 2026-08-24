"use server";

import { auth } from "@/auth";
import { CampaignService } from "@/lib/services/campaign-service";
import { revalidatePath } from "next/cache";

export async function getCampaignStatusesAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  try {
    // Dynamically evaluate and auto-claim any newly satisfied campaigns
    await CampaignService.evaluateAndClaimCampaigns(userId);

    const data = await CampaignService.getCampaignStatuses(userId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function forceReevaluateCampaignsAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  try {
    await CampaignService.evaluateAndClaimCampaigns(userId);
    revalidatePath("/campaigns");
    revalidatePath("/schedule");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
