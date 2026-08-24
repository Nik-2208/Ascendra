import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  soundEnabled: boolean;
  toggleSound: () => void;
  musicEnabled: boolean;
  toggleMusic: () => void;
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  customCursorEnabled: boolean;
  toggleCustomCursor: () => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  developerMode: boolean;
  toggleDeveloperMode: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  accessibilityFont: boolean;
  toggleAccessibilityFont: () => void;
  
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;

  achievementQueue: unknown[];
  pushAchievement: (achievement: unknown) => void;
  popAchievement: () => void;

  levelUpOverlay: number | null;
  triggerLevelUp: (newLevel: number) => void;
  clearLevelUp: () => void;

  bossDefeatData: unknown | null;
  triggerBossDefeat: (boss: unknown) => void;
  clearBossDefeat: () => void;

  lootRevealData: unknown | null;
  triggerLootReveal: (item: unknown) => void;
  clearLootReveal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      musicEnabled: true,
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      animationsEnabled: true,
      toggleAnimations: () => set((state) => ({ animationsEnabled: !state.animationsEnabled })),
      customCursorEnabled: true,
      toggleCustomCursor: () => set((state) => ({ customCursorEnabled: !state.customCursorEnabled })),
      notificationsEnabled: true,
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      developerMode: false,
      toggleDeveloperMode: () => set((state) => ({ developerMode: !state.developerMode })),
      language: "en",
      setLanguage: (language) => set({ language }),
      accessibilityFont: false,
      toggleAccessibilityFont: () => set((state) => ({ accessibilityFont: !state.accessibilityFont })),
      
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),
      isSidebarOpen: false,
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      achievementQueue: [],
      pushAchievement: (achievement) =>
        set((state) => ({ achievementQueue: [...state.achievementQueue, achievement] })),
      popAchievement: () =>
        set((state) => ({ achievementQueue: state.achievementQueue.slice(1) })),

      levelUpOverlay: null,
      triggerLevelUp: (newLevel) => set({ levelUpOverlay: newLevel }),
      clearLevelUp: () => set({ levelUpOverlay: null }),

      bossDefeatData: null,
      triggerBossDefeat: (boss) => set({ bossDefeatData: boss }),
      clearBossDefeat: () => set({ bossDefeatData: null }),

      lootRevealData: null,
      triggerLootReveal: (item) => set({ lootRevealData: item }),
      clearLootReveal: () => set({ lootRevealData: null }),
    }),
    {
      name: "life-os-ui-storage",
      partialize: (state) => ({ 
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        animationsEnabled: state.animationsEnabled,
        customCursorEnabled: state.customCursorEnabled,
        notificationsEnabled: state.notificationsEnabled,
        developerMode: state.developerMode,
        language: state.language,
        accessibilityFont: state.accessibilityFont
      }),
    }
  )
);
