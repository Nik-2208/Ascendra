import type { AnalyticsEvent, AnalyticsEventPayload, ActionLogEntry } from "@/types";

// Batch buffer for analytics
let eventBuffer: Omit<AnalyticsEventPayload, "timestamp">[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_THRESHOLD = 10;
const FLUSH_INTERVAL_MS = 5000;

let currentUserId: string | null = null;

export function initAnalytics(userId: string) {
  currentUserId = userId;
}

export function disposeAnalytics() {
  currentUserId = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

// Push event to buffer
export function trackEvent(
  event: AnalyticsEvent,
  metadata: Record<string, string | number | boolean> = {}
) {
  if (!currentUserId) return;
  
  eventBuffer.push({ event, metadata });

  if (eventBuffer.length >= FLUSH_THRESHOLD) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL_MS);
  }
}

async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (!currentUserId || eventBuffer.length === 0) return;

  const eventsToFlush = [...eventBuffer];
  eventBuffer = [];

  // Use a Server Action to flush events
  try {
    const { flushAnalyticsEventsAction } = await import("@/actions/game-actions");
    await flushAnalyticsEventsAction(currentUserId, eventsToFlush);
  } catch (error) {
    console.error("Failed to flush analytics", error);
  }
}

// Fetch analytics for display
export function subscribeToRecentEvents(
  userId: string,
  callback: (events: ActionLogEntry[]) => void,
  maxEvents: number = 50
): () => void {
  let active = true;

  const fetchEvents = async () => {
    try {
      const { getActionLogsAction } = await import("@/actions/game-actions");
      const logs = await getActionLogsAction(userId);
      if (active) {
        callback(logs as ActionLogEntry[]);
      }
    } catch (e) {
      if (active) callback([]);
    }
  };

  fetchEvents();
  const interval = setInterval(fetchEvents, 10000); // Polling as fallback

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function getEventCountByType(
  userId: string,
  event: AnalyticsEvent,
  sinceDaysAgo: number = 7
): Promise<number> {
  try {
    const { getEventCountAction } = await import("@/actions/game-actions");
    return await getEventCountAction(userId, event, sinceDaysAgo);
  } catch (e) {
    return 0;
  }
}
