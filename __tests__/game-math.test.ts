import { gameMath } from "../src/lib/game-math";

describe("Game Math Engine", () => {
  describe("XP and Leveling", () => {
    test("Level 1 requires 0 XP", () => {
      expect(gameMath.xpForLevel(1)).toBe(0);
    });

    test("Level 2 requires 100 XP", () => {
      expect(gameMath.xpForLevel(2)).toBe(100);
    });

    test("XP scales exponentially", () => {
      const lvl3XP = gameMath.xpForLevel(3);
      const lvl4XP = gameMath.xpForLevel(4);
      expect(lvl3XP).toBeGreaterThan(200); // 100 * (2^1.5) = 282
      expect(lvl4XP).toBeGreaterThan(lvl3XP);
    });

    test("Calculates correct level from total XP", () => {
      expect(gameMath.levelFromXP(0)).toBe(1);
      expect(gameMath.levelFromXP(50)).toBe(1);
      expect(gameMath.levelFromXP(100)).toBe(2);
      expect(gameMath.levelFromXP(283)).toBe(3);
    });

    test("Calculates correct level progress percentage", () => {
      const progress = gameMath.levelProgress(150);
      expect(progress.currentLevel).toBe(2);
      expect(progress.xpIntoLevel).toBe(50); // 150 - 100
      expect(progress.xpRequiredForNextLevel).toBe(182); // 282 - 100
      expect(Math.round(progress.percentage)).toBe(27); // 50 / 182
    });
  });

  describe("Combat Math", () => {
    test("Damage is mitigated by defense", () => {
      const damage1 = gameMath.calculateDamage(100, 0); // 0% reduction
      expect(damage1).toBe(100);

      const damage2 = gameMath.calculateDamage(100, 50); // 50% reduction
      expect(damage2).toBe(50);

      const damage3 = gameMath.calculateDamage(100, 150); // 75% reduction
      expect(damage3).toBe(25);
    });

    test("Damage never falls below 1", () => {
      const damage = gameMath.calculateDamage(10, 1000); // Massive defense
      expect(damage).toBe(1);
    });
  });
});
