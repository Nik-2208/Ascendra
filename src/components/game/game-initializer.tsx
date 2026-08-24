"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { onGameEvent } from "@/lib/game-event-bus";
import { useCharacterStore } from "@/stores/character-store";
import { useQuestStore } from "@/stores/quest-store";
import { useBossStore } from "@/stores/boss-store";
import { useStreakStore } from "@/stores/streak-store";
import { usePetStore } from "@/stores/pet-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { useAchievementStore } from "@/stores/achievement-store";
import { initAnalytics, disposeAnalytics } from "@/lib/analytics-engine";
import { subscribeToNotifications } from "@/lib/notification-engine";
import { useUIStore } from "@/stores/ui-store";

/**
 * GameInitializer is a headless component mounted once in the root layout.
 * It is responsible for attaching all real-time Firestore listeners for the authenticated user,
 * keeping the Zustand stores populated across all route transitions.
 */
export function GameInitializer() {
  const { data: session } = useSession();
  const user = session?.user;
  
  // Store initializers
  const loadCharacter = useCharacterStore((state) => state.loadProfile);
  const loadQuests = useQuestStore((state) => state.loadQuests);
  const loadBosses = useBossStore((state) => state.loadBosses);
  const loadStreaks = useStreakStore((state) => state.loadData);
  const loadPets = usePetStore((state) => state.loadData);
  const loadInventory = useInventoryStore((state) => state.loadInventory);
  const loadAchievements = useAchievementStore((state) => state.loadData);
  const queryClient = useQueryClient();
  
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!user) {
      if (hasInitialized.current) {
        // Handle logout cleanup
        disposeAnalytics();
        hasInitialized.current = false;
      }
      return;
    }

    if (hasInitialized.current) return;

    // Initialize Analytics
    initAnalytics(user.id!);

    // Fetch initial data for all stores
    loadCharacter(user.id!);
    loadQuests(user.id!);
    loadBosses(user.id!);
    loadStreaks(user.id!);
    loadPets(user.id!);
    loadInventory(user.id!);
    loadAchievements(user.id!);

    // Notifications directly to UI store or local state
    // For now we just console log them or let another component handle them
    // but the listener is active here to warm up the connection.
    const unsubNotifications = subscribeToNotifications(user.id!, (notifs) => {
      // In a real app, we might push these to a notification store
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    const unsubEvents = onGameEvent("*", (event) => {
      // Globally invalidate queries to ensure hot UI updates across the board
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shop"] });
      queryClient.invalidateQueries({ queryKey: ["activeQuests"] });
      queryClient.invalidateQueries({ queryKey: ["focusStats"] });

      // Refresh Zustand stores so HUDs, sidebar levels, coins, and widgets update instantly
      const uid = user.id!;
      loadCharacter(uid);
      loadQuests(uid);
      loadBosses(uid);
      loadStreaks(uid);
      loadPets(uid);
      loadInventory(uid);
      loadAchievements(uid);
    });

    hasInitialized.current = true;

    return () => {
      unsubNotifications();
      unsubEvents();
      disposeAnalytics();
      hasInitialized.current = false;
    };
  }, [
    user,
    loadCharacter,
    loadQuests,
    loadBosses,
    loadStreaks,
    loadPets,
    loadInventory,
    loadAchievements,
  ]);

  return null; // Headless component
}
