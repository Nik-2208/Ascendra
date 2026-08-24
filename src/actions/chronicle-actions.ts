"use server";

import { auth } from "@/auth";
import { ChroniclesService, ChronicleType } from "@/lib/services/chronicles-service";
import { revalidatePath } from "next/cache";

export async function getChroniclesAction(options: {
  type?: string;
  search?: string;
  dateRange?: "all" | "today" | "week" | "month";
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await ChroniclesService.getEntries(session.user.id, options);
  return { success: true, data: result };
}

export async function createChronicleAction(
  type: ChronicleType,
  title: string,
  content: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const entry = await ChroniclesService.createEntry(session.user.id, type, title, content);
  if (entry) {
    revalidatePath("/weekly-review");
    revalidatePath("/chronicles");
    return { success: true, data: entry };
  }
  return { success: false, error: "Failed to create chronicle entry" };
}

export async function clearChroniclesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const success = await ChroniclesService.clearEntries(session.user.id);
  if (success) {
    revalidatePath("/weekly-review");
    revalidatePath("/chronicles");
    return { success: true };
  }
  return { success: false, error: "Failed to clear chronicle entries" };
}
