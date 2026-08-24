"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, ActionResponse, executeSecureAction } from "@/lib/actions-utils";
import * as aiService from "@/lib/services/openrouter-service";
import { z } from "zod";

// Zod schemas for AI actions
const MessageActionSchema = z.object({
  messageContent: z.string().min(1, "Message content is required").max(4000, "Message too long"),
  conversationId: z.string().uuid().optional(),
});

const SearchActionSchema = z.string().max(200, "Search query is too long");
const AvailabilitySchema = z.string().max(200, "Availability description is too long");
const PatternsSchema = z.string().max(500, "Productivity patterns description is too long");

export async function sendMessageAction(
  rawContent: string,
  conversationId?: string
): Promise<ActionResponse<{ content: string; reasoning_details?: string; conversationId: string }>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // Validate inputs
    const parsedInput = MessageActionSchema.parse({
      messageContent: rawContent,
      conversationId: conversationId || undefined
    });

    let messages: aiService.Message[] = [];
    if (parsedInput.conversationId) {
      // ownership check for the conversation (IDOR prevention)
      const convo = await prisma.aIConversation.findFirst({
        where: { id: parsedInput.conversationId, userId }
      });
      if (!convo) throw new Error("Conversation not found or access denied");

      const dbMessages = Array.isArray(convo.messages) ? convo.messages : [];
      messages = dbMessages.map((m: unknown) => {
        const msg = m as { role: "user" | "assistant" | "system"; content: string; reasoning_details?: string };
        return {
          role: msg.role,
          content: msg.content,
          reasoning_details: msg.reasoning_details
        };
      });
    }

    // Guard AI Inputs - Strip potential injection code and enforce structure
    const sanitizedContent = parsedInput.messageContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Basic XSS check
      .trim();

    messages.push({
      role: "user",
      content: sanitizedContent
    });

    const result = await aiService.chat(messages, userId, parsedInput.conversationId);
    return result;
  });
}

export async function getConversationsAction(): Promise<ActionResponse<unknown[]>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const convos = await prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });

    return convos;
  });
}

export async function getConversationAction(id: string): Promise<ActionResponse<unknown>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!id || typeof id !== "string") throw new Error("Invalid conversation identifier");

    const convo = await prisma.aIConversation.findFirst({
      where: { id, userId } // Ownership check (IDOR prevention)
    });

    if (!convo) throw new Error("Conversation not found or unauthorized");
    return convo;
  });
}

export async function deleteConversationAction(id: string): Promise<ActionResponse<{ success: boolean }>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!id || typeof id !== "string") throw new Error("Invalid conversation identifier");

    const convo = await prisma.aIConversation.findFirst({
      where: { id, userId }
    });
    if (!convo) throw new Error("Conversation not found or unauthorized");

    await prisma.aIConversation.delete({
      where: { id, userId }
    });

    return { success: true };
  });
}

export async function clearAllConversationsAction(): Promise<ActionResponse<{ success: boolean }>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    await prisma.aIConversation.deleteMany({
      where: { userId }
    });

    return { success: true };
  });
}

export async function renameConversationAction(id: string, titleRaw: string): Promise<ActionResponse<unknown>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!id || typeof id !== "string") throw new Error("Invalid conversation identifier");
    
    const title = titleRaw.trim().substring(0, 100);
    if (!title) throw new Error("Title is required");

    const convo = await prisma.aIConversation.findFirst({
      where: { id, userId }
    });
    if (!convo) throw new Error("Conversation not found or unauthorized");

    const updated = await prisma.aIConversation.update({
      where: { id, userId },
      data: { title }
    });

    return updated;
  });
}

export async function autocompleteAction(text: string, context: string): Promise<ActionResponse<string>> {
  return executeSecureAction(async () => {
    const textSanitized = text.substring(0, 500);
    const contextSanitized = context.substring(0, 1000);
    const completion = await aiService.autocomplete(textSanitized, contextSanitized);
    return completion;
  });
}

export async function rewriteAction(text: string, tone: string): Promise<ActionResponse<string>> {
  return executeSecureAction(async () => {
    const textSanitized = text.substring(0, 2000);
    const toneSanitized = tone.substring(0, 100);
    const rewritten = await aiService.rewrite(textSanitized, toneSanitized);
    return rewritten;
  });
}

export async function suggestAction(context: string): Promise<ActionResponse<string>> {
  return executeSecureAction(async () => {
    const contextSanitized = context.substring(0, 2000);
    const suggestion = await aiService.suggest(contextSanitized);
    return suggestion;
  });
}

export async function categorizeAction(text: string, categories: string[]): Promise<ActionResponse<string>> {
  return executeSecureAction(async () => {
    const textSanitized = text.substring(0, 200);
    const categoriesSanitized = categories.map(c => c.substring(0, 50));
    const category = await aiService.classify(textSanitized, categoriesSanitized);
    return category;
  });
}

export async function autoScheduleTasksAction(
  availabilityRaw: string,
  productivityPatternsRaw: string
): Promise<ActionResponse<{ explanation: string; events: unknown[] }>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const availability = AvailabilitySchema.parse(availabilityRaw);
    const productivityPatterns = PatternsSchema.parse(productivityPatternsRaw);

    // Fetch incomplete tasks owned by user
    const tasks = await prisma.task.findMany({
      where: { userId, completed: false }
    });

    if (tasks.length === 0) {
      throw new Error("No active tasks to schedule. Create some tasks first!");
    }

    const scheduleResponse = await aiService.generateSchedule(tasks, availability, productivityPatterns);

    let parsedSchedule: unknown;
    try {
      const cleanJson = scheduleResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedSchedule = JSON.parse(cleanJson);
    } catch (parseErr) {
      throw new Error("AI returned malformed scheduling plan. Please try again.");
    }

    return parsedSchedule as { explanation: string; events: unknown[] };
  });
}

export async function applyScheduleAction(events: unknown[]): Promise<ActionResponse<{ success: boolean }>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!Array.isArray(events) || events.length === 0) throw new Error("Invalid events list");

    // Ownership check transaction - verify matching active tasks belong to user
    await prisma.$transaction(
      events.map((event, index) => {
        const ev = event as { title: string; startTime?: string };
        return prisma.task.updateMany({
          where: {
            userId,
            title: ev.title,
            completed: false
          },
          data: {
            dueTime: ev.startTime ? new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            order: index
          }
        });
      })
    );

    return { success: true };
  });
}

export async function aiSearchTasksAction(rawQuery: string): Promise<ActionResponse<unknown[]>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const query = SearchActionSchema.parse(rawQuery);

    const tasks = await prisma.task.findMany({
      where: { userId }
    });

    if (tasks.length === 0) {
      return [];
    }

    const prompt = `You are a semantic task search assistant. 
Search query: "${query}"
All Tasks:
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description, completed: t.completed, priority: t.priority, category: t.category, dueDate: t.dueDate })), null, 2)}

Return a JSON array of task IDs that match the search query semantically.
Example output:
["task-id-1", "task-id-2"]`;

    const { content } = await aiService.openRouterRequest(
      [
        { role: "system", content: "You are an assistant that outputs only JSON arrays of strings." },
        { role: "user", content: prompt }
      ],
      { temperature: 0.1 }
    );

    let matchedIds: string[] = [];
    try {
      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      matchedIds = JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Could not parse search results, returning exact/loose match fallback", e);
    }

    const matchedTasks = tasks.filter(t => matchedIds.includes(t.id));
    return matchedTasks;
  });
}

export async function getAnalyticsExplanationAction(
  weeklyStats: unknown,
  profile: unknown,
  completionRate: number
): Promise<ActionResponse<string>> {
  return executeSecureAction(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const stats = weeklyStats as { questsCompleted: number; bossHits: number; streakCheckins: number; levelsGained: number };
    const prof = profile as { level: number; coins: number } | null;

    const prompt = `You are a legendary RPG Life Coach and Analytics Advisor.
Analyze this user's weekly metrics:
- Quests completed in last 7 days: ${stats.questsCompleted}
- Boss damage hits in last 7 days: ${stats.bossHits}
- Streak check-ins in last 7 days: ${stats.streakCheckins}
- Levels gained in last 7 days: ${stats.levelsGained}
- Character Level: ${prof?.level || 1}
- Total Coins: ${prof?.coins || 0}
- Quest Completion Rate: ${completionRate}%

Explain what these numbers mean RPG-wise, what changed, highlight strengths, identify any productivity bottlenecks (e.g. low streak checkins compared to quests completed), and suggest 2 specific actions the user should take. Keep the response motivating, analytical, and short (3-4 sentences total).`;

    const { content } = await aiService.openRouterRequest([
      { role: "system", content: "You are a motivating RPG analytics advisor." },
      { role: "user", content: prompt }
    ], { temperature: 0.5 });

    return content;
  });
}
