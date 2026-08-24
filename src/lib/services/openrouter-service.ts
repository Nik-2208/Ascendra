import "server-only";
import { prisma } from "@/lib/prisma";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "nvidia/nemotron-3-ultra-550b-a55b:free";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_details?: string;
}

// Simple in-memory cache for static calls (summarize, classify, suggest, etc.)
const aiCache = new Map<string, string>();

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core function to send requests to OpenRouter
 */
export async function openRouterRequest(
  messages: Message[],
  options: {
    temperature?: number;
    max_tokens?: number;
    cacheKey?: string;
  } = {}
): Promise<{ content: string; reasoning_details?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY is not defined in environment variables. Returning mock/fallback response.");
    return {
      content: "AI features are ready. Please configure your OPENROUTER_API_KEY in the environment settings.",
      reasoning_details: "Skipped API call due to missing API key."
    };
  }

  // Check cache
  if (options.cacheKey && aiCache.has(options.cacheKey)) {
    return { content: aiCache.get(options.cacheKey)! };
  }

  const payload = {
    model: MODEL_NAME,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.reasoning_details ? { reasoning_details: m.reasoning_details } : {}),
    })),
    reasoning: {
      enabled: true,
    },
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000,
  };

  let retries = 3;
  let backoff = 1000;

  while (retries > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://github.com/google-deepmind/antigravity", // Optional site referer
          "X-Title": "Life RPG OS",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      const content = message?.content || "";
      const reasoning_details = message?.reasoning_details || choice?.reasoning_details;

      if (options.cacheKey && content) {
        aiCache.set(options.cacheKey, content);
      }

      return { content, reasoning_details };
    } catch (err) {
      retries--;
      console.error(`OpenRouter request failed. Retries left: ${retries}. Error:`, (err as Error).message);
      if (retries === 0) {
        throw err;
      }
      await delay(backoff);
      backoff *= 2; // Exponential backoff
    }
  }

  throw new Error("Failed to get response from OpenRouter after retries");
}

/**
 * Chat Completion Helper
 */
export async function chat(
  messages: Message[],
  userId: string,
  conversationId?: string
): Promise<{ content: string; reasoning_details?: string; conversationId: string }> {
  // If conversationId is provided, fetch history, append user message, send, save new message and return
  // Otherwise create a new conversation
  const response = await openRouterRequest(messages);

  let finalConversationId = conversationId;
  const assistantMessage = {
    role: "assistant" as const,
    content: response.content,
    ...(response.reasoning_details ? { reasoning_details: response.reasoning_details } : {}),
    timestamp: new Date().toISOString(),
  };

  const userMsgInput = messages[messages.length - 1];
  const userMessage = {
    role: "user" as const,
    content: userMsgInput.content,
    timestamp: new Date().toISOString(),
  };

  if (conversationId) {
    const convo = await prisma.aIConversation.findUnique({ where: { id: conversationId } });
    if (convo) {
      const history = Array.isArray(convo.messages) ? convo.messages : [];
      const updatedMessages = [...history, userMessage, assistantMessage];
      await prisma.aIConversation.update({
        where: { id: conversationId },
        data: { messages: updatedMessages },
      });
    }
  } else {
    // Generate automatic title from first 30 chars
    const title = userMsgInput.content.substring(0, 40) + (userMsgInput.content.length > 40 ? "..." : "");
    const convo = await prisma.aIConversation.create({
      data: {
        userId,
        title,
        messages: [userMessage, assistantMessage],
      },
    });
    finalConversationId = convo.id;
  }

  return {
    content: response.content,
    reasoning_details: response.reasoning_details,
    conversationId: finalConversationId!,
  };
}

/**
 * Generate optimized calendar schedule
 */
export async function generateSchedule(
  tasks: unknown[],
  availability: string,
  productivityPatterns: string
): Promise<string> {
  const prompt = `You are an AI Smart Scheduler for a gamified Life RPG app.
Tasks to schedule:
${JSON.stringify(tasks, null, 2)}

User Availability constraints: ${availability}
User Productivity patterns/preferences: ${productivityPatterns}

Please analyze the tasks (priorities, deadlines, categories) and create a structured day schedule.
For each event, specify:
- Start Time & End Time
- Title (must match one of the task titles or a productivity focus block)
- Description / Strategy explanation (Why scheduled here, connection to productivity patterns)

Return the output in clean JSON format:
\`\`\`json
{
  "explanation": "Brief strategy overview...",
  "events": [
    {
      "title": "Task or Block Title",
      "description": "Why structured this way...",
      "startTime": "YYYY-MM-DDT[HH]:[MM]:00Z",
      "endTime": "YYYY-MM-DDT[HH]:[MM]:00Z"
    }
  ]
}
\`\`\``;

  const { content } = await openRouterRequest(
    [
      { role: "system", content: "You are an expert scheduler that outputs only JSON." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2 }
  );

  return content;
}

/**
 * Generate AI coach insights
 */
export async function generateInsights(profile: unknown, recentQuests: unknown[], streaks: unknown[], moneyJar: unknown): Promise<string> {
  const p = profile as { level: number; class: string; xp: number; stats?: Record<string, { level: number; xp: number } | number | undefined> };
  const jar = moneyJar as { coins?: number; realMoneySaved?: number } | null;

  const prompt = `You are a legendary RPG Life Coach. Analyze this user's character stats and status to generate actionable, personalized coaching insights.
  
Character Profile:
- Level: ${p.level}
- Class: ${p.class}
- XP: ${p.xp}
- Stats: Strength ${p.stats?.strength}, Intelligence ${p.stats?.intelligence}, Agility ${p.stats?.agility}, Defense ${p.stats?.defense}, Luck ${p.stats?.luck}

Streaks:
${JSON.stringify(streaks, null, 2)}

Money Jar Coins: ${jar?.coins || 0}
Real Money Saved: ${jar?.realMoneySaved || 0}

Recent Completed Quests:
${JSON.stringify(recentQuests.slice(0, 10), null, 2)}

Generate 3-4 structured coach insights. Each insight should have:
1. "title": Short catchy RPG title
2. "type": "positive" (for success/good habits), "warning" (for issues/lagging stats), or "suggestion" (for new actions/shop treats)
3. "content": Empowering, descriptive advice in an engaging RPG coach voice.

Return output strictly in JSON format matching this schema:
\`\`\`json
[
  {
    "title": "Iron Focus",
    "type": "positive",
    "content": "Description..."
  }
]
\`\`\``;

  const { content } = await openRouterRequest(
    [
      { role: "system", content: "You are an RPG Life Coach that outputs only JSON." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.6 }
  );

  return content;
}

/**
 * Summarize text
 */
export async function summarize(text: string): Promise<string> {
  const cacheKey = `sum:${text.slice(0, 200)}`;
  const { content } = await openRouterRequest(
    [
      { role: "system", content: "You are an assistant that summarizes text concisely in 1-2 sentences." },
      { role: "user", content: `Please summarize this: ${text}` },
    ],
    { temperature: 0.3, cacheKey }
  );
  return content;
}

/**
 * Suggest next actions
 */
export async function suggest(context: string): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "Recommend 2-3 quick next actions or tips based on the current context." },
    { role: "user", content: context },
  ]);
  return content;
}

/**
 * Analyze charts/data
 */
export async function analyze(data: string): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "You are an analytics assistant. Explain trends, anomalies, and insights from this data." },
    { role: "user", content: data },
  ]);
  return content;
}

/**
 * Rewrite text
 */
export async function rewrite(text: string, tone: string): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: `Rewrite the user's text to have a ${tone} tone. Maintain the original message details but adjust the style.` },
    { role: "user", content: text },
  ]);
  return content;
}

/**
 * Classify items / categories
 */
export async function classify(text: string, categories: string[]): Promise<string> {
  const cacheKey = `cls:${text.slice(0, 100)}:${categories.join(",")}`;
  const { content } = await openRouterRequest(
    [
      { role: "system", content: `Classify the item into exactly one of these categories: ${categories.join(", ")}. Return only the category name.` },
      { role: "user", content: text },
    ],
    { temperature: 0.1, cacheKey }
  );
  return content;
}

/**
 * Extract entities
 */
export async function extract(text: string): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "Extract key deadlines, categories, and parameters from this text as JSON." },
    { role: "user", content: text },
  ]);
  return content;
}

/**
 * Brainstorm ideas
 */
export async function brainstorm(topic: string): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "Provide a creative list of 5 gamified tasks or ideas for the user's quest line." },
    { role: "user", content: topic },
  ]);
  return content;
}

/**
 * Prioritize tasks
 */
export async function prioritize(tasks: unknown[]): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "Analyze these tasks and order them by urgency & priority. Explain why." },
    { role: "user", content: JSON.stringify(tasks) },
  ]);
  return content;
}

/**
 * Recommend rewards / shop purchases
 */
export async function recommend(profile: unknown): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "Recommend in-game strategies or items from shop that will benefit the user most." },
    { role: "user", content: JSON.stringify(profile) },
  ]);
  return content;
}

/**
 * Plan long term goals
 */
export async function plan(goal: string): Promise<string> {
  const { content } = await openRouterRequest([
    { role: "system", content: "Break down this major life goal into 5 smaller executable quests." },
    { role: "user", content: goal },
  ]);
  return content;
}

/**
 * Autocomplete / smart suggest input
 */
export async function autocomplete(text: string, context: string): Promise<string> {
  const cacheKey = `auto:${context}:${text}`;
  const { content } = await openRouterRequest(
    [
      { role: "system", content: "Provide a quick, highly accurate completion of the user's sentence (just 1-5 words maximum). Do not repeat the input." },
      { role: "user", content: `Context: ${context}\nInput: ${text}` },
    ],
    { temperature: 0.1, max_tokens: 30, cacheKey }
  );
  return content;
}
