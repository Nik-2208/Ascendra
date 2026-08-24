// Sound Engine — lightweight audio manager for game feedback
import { useUIStore } from "@/stores/ui-store";
type SoundName =
  | "quest_complete"
  | "level_up"
  | "loot_drop"
  | "boss_hit"
  | "boss_defeat"
  | "achievement"
  | "click"
  | "streak_checkin"
  | "error"
  | "skill_unlock"
  | "region_discovery";

// We use Web Audio API oscillator-based synthesis instead of audio files
// to keep the bundle zero-dependency and instant-load.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", gain: number = 0.15) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available, fail silently
  }
}

const SOUND_MAP: Record<SoundName, () => void> = {
  quest_complete: () => {
    playTone(523, 0.1, "sine"); // C5
    setTimeout(() => playTone(659, 0.1, "sine"), 100); // E5
    setTimeout(() => playTone(784, 0.2, "sine"), 200); // G5
  },
  level_up: () => {
    playTone(523, 0.1, "square", 0.1);
    setTimeout(() => playTone(659, 0.1, "square", 0.1), 80);
    setTimeout(() => playTone(784, 0.1, "square", 0.1), 160);
    setTimeout(() => playTone(1047, 0.3, "square", 0.1), 240);
  },
  loot_drop: () => {
    playTone(880, 0.15, "sine");
    setTimeout(() => playTone(1100, 0.15, "sine"), 120);
    setTimeout(() => playTone(1320, 0.3, "sine"), 240);
  },
  boss_hit: () => {
    playTone(120, 0.15, "sawtooth", 0.2);
  },
  boss_defeat: () => {
    playTone(262, 0.15, "square", 0.1);
    setTimeout(() => playTone(330, 0.15, "square", 0.1), 100);
    setTimeout(() => playTone(392, 0.15, "square", 0.1), 200);
    setTimeout(() => playTone(523, 0.4, "square", 0.15), 300);
  },
  achievement: () => {
    playTone(660, 0.1, "sine");
    setTimeout(() => playTone(880, 0.1, "sine"), 100);
    setTimeout(() => playTone(1100, 0.25, "sine"), 200);
  },
  click: () => {
    playTone(800, 0.05, "sine", 0.05);
  },
  streak_checkin: () => {
    playTone(440, 0.1, "triangle");
    setTimeout(() => playTone(660, 0.15, "triangle"), 100);
  },
  error: () => {
    playTone(200, 0.15, "sawtooth", 0.1);
    setTimeout(() => playTone(150, 0.2, "sawtooth", 0.1), 150);
  },
  skill_unlock: () => {
    // High-pitched ascending magical chime
    playTone(523.25, 0.08, "triangle", 0.1);
    setTimeout(() => playTone(659.25, 0.08, "triangle", 0.1), 60);
    setTimeout(() => playTone(783.99, 0.08, "triangle", 0.1), 120);
    setTimeout(() => playTone(1046.50, 0.08, "triangle", 0.1), 180);
    setTimeout(() => playTone(1318.51, 0.25, "sine", 0.08), 240);
  },
  region_discovery: () => {
    // Grand epic fanfare / brassy tone
    playTone(392.00, 0.15, "square", 0.06);
    setTimeout(() => playTone(523.25, 0.15, "square", 0.06), 150);
    setTimeout(() => playTone(659.25, 0.15, "square", 0.06), 300);
    setTimeout(() => playTone(783.99, 0.4, "sine", 0.1), 450);
  },
};

export function setSoundEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    const state = useUIStore.getState();
    if (state.soundEnabled !== enabled) {
      state.toggleSound();
    }
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window !== "undefined") {
    return useUIStore.getState().soundEnabled;
  }
  return true;
}

export function playSound(name: SoundName) {
  if (!isSoundEnabled()) return;

  // Respect prefers-reduced-motion
  if (typeof window !== "undefined") {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;
  }

  SOUND_MAP[name]?.();
}

// Legacy wrapper to support existing calls
export const soundEngine = {
  playQuestComplete: () => playSound("quest_complete"),
  playLevelUp: () => playSound("level_up"),
  playBossDefeat: () => playSound("boss_defeat"),
  playUrgeVictory: () => playSound("quest_complete"),
  playUrgeDefeat: () => playSound("error"),
  playCoinSpend: () => playSound("click"),
  playAchievement: () => playSound("achievement"),
  playStreakCheckin: () => playSound("streak_checkin"),
  playSkillUnlock: () => playSound("skill_unlock"),
  playRegionDiscovery: () => playSound("region_discovery"),
  toggleSound: () => {
    setSoundEnabled(!isSoundEnabled());
  },
  isSoundEnabled: () => isSoundEnabled()
};
