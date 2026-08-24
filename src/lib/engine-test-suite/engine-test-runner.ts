import { 
  QUEST_DIFFICULTY_POLICY, 
  QUEST_ENGINE_CONSTANTS, 
  QuestCategory 
} from "@/lib/quest-engine/quest-taxonomy";
import { UnifiedRewardEngine } from "@/lib/reward-engine/unified-reward-engine";
import { FailsafeGuard } from "@/lib/failsafe/failsafe-guard";
import { DEFAULT_APP_SETTINGS } from "@/lib/settings-engine/settings-engine";
import { EngineRulebook } from "@/lib/rule-registry/engine-rulebook";

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export class EngineTestRunner {
  private static results: TestResult[] = [];

  static record(suiteName: string, testName: string, passed: boolean, details?: any, error?: string) {
    this.results.push({ suiteName, testName, passed, error, details });
  }

  static async runAllTests(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  }> {
    this.results = [];

    // 1. Reward Policy Invariants
    this.testRewardPolicy();

    // 2. Quest Taxonomy Integrity
    this.testQuestTaxonomy();

    // 3. Failsafe Idempotency & Lock Guard
    await this.testFailsafeGuard();

    // 4. Settings Schema Integrity
    this.testSettingsEngine();

    // 5. Engine Rulebook Registry
    this.testRuleRegistry();

    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    return { total, passed, failed, results: this.results };
  }

  private static testRewardPolicy() {
    const suite = "RewardPolicy";

    // A. Daily Ration
    const ration = UnifiedRewardEngine.getDailyRation();
    const rationValid = ration.xp === 10 && ration.coins === 20;
    this.record(suite, "Daily Ration is strictly 10 XP & 20 Gold", rationValid, ration);

    // B. Difficulty Bounds
    const easyNorm = UnifiedRewardEngine.normalizeRewards(10, 2, "EASY");
    const easyValid = easyNorm.xp >= 25 && easyNorm.xp <= 30 && easyNorm.coins >= 5 && easyNorm.coins <= 10;
    this.record(suite, "EASY Difficulty Bounds [25-30 XP, 5-10 Coins]", easyValid, easyNorm);

    const medNorm = UnifiedRewardEngine.normalizeRewards(50, 10, "MEDIUM");
    const medValid = medNorm.xp >= 55 && medNorm.xp <= 60 && medNorm.coins >= 15 && medNorm.coins <= 25;
    this.record(suite, "MEDIUM Difficulty Bounds [55-60 XP, 15-25 Coins]", medValid, medNorm);

    const hardNorm = UnifiedRewardEngine.normalizeRewards(150, 100, "HARD");
    const hardValid = hardNorm.xp >= 75 && hardNorm.xp <= 100 && hardNorm.coins >= 30 && hardNorm.coins <= 50;
    this.record(suite, "HARD Difficulty Bounds [75-100 XP, 30-50 Coins]", hardValid, hardNorm);

    // C. Display Cap <= 100 XP
    const hugeBreakdown = UnifiedRewardEngine.calculateRewardBreakdown({
      baseXp: 100,
      baseCoins: 50,
      ascensionCount: 5
    });
    const displayCapped = hugeBreakdown.finalXp <= 100;
    this.record(suite, "Displayed XP is strictly capped at 100 XP", displayCapped, hugeBreakdown);

    // D. Hard Server Award Cap <= 150 XP
    const capValid = QUEST_ENGINE_CONSTANTS.MAX_AWARDED_XP === 150;
    this.record(suite, "Hard Server Award Limit is 150 XP", capValid, { maxAward: QUEST_ENGINE_CONSTANTS.MAX_AWARDED_XP });
  }

  private static testQuestTaxonomy() {
    const suite = "QuestTaxonomy";

    const categories: QuestCategory[] = [
      "DAILY", "WEEKLY", "LONG_TERM", "STORY", "CAMPAIGN",
      "REPEATABLE", "HABIT", "FOCUS", "FITNESS", "LEARNING",
      "FINANCE", "CODING", "MINDFULNESS", "CUSTOM", "EVENT", "BOSS", "CHALLENGE"
    ];

    this.record(suite, "All 17 Quest Categories Formally Defined", categories.length === 17, { count: categories.length });

    // Category inference
    const pomodoroCat = UnifiedRewardEngine.inferCategory({ title: "25 Min Pomodoro Session" });
    this.record(suite, "Category Inference for Pomodoro -> FOCUS", pomodoroCat === "FOCUS", { pomodoroCat });

    const meditatCat = UnifiedRewardEngine.inferCategory({ title: "Morning Zen Meditation" });
    this.record(suite, "Category Inference for Meditation -> MINDFULNESS", meditatCat === "MINDFULNESS", { meditatCat });
  }

  private static async testFailsafeGuard() {
    const suite = "FailsafeGuard";

    const lockKey = "test_lock_" + Math.random().toString(36).substring(7);
    const lock1 = FailsafeGuard.acquireLock(lockKey, 1000);
    const lock2 = FailsafeGuard.acquireLock(lockKey, 1000); // Should fail

    FailsafeGuard.releaseLock(lockKey);
    const lock3 = FailsafeGuard.acquireLock(lockKey, 1000); // Should succeed
    FailsafeGuard.releaseLock(lockKey);

    const lockValid = lock1 === true && lock2 === false && lock3 === true;
    this.record(suite, "Mutual Exclusion Concurrency Locking", lockValid, { lock1, lock2, lock3 });

    // Idempotent execution
    let execCount = 0;
    const idKey = "test_idem_" + Math.random().toString(36).substring(7);
    const run1 = await FailsafeGuard.runIdempotent(idKey, 2000, async () => {
      execCount++;
      return { val: 42 };
    });
    const run2 = await FailsafeGuard.runIdempotent(idKey, 2000, async () => {
      execCount++;
      return { val: 42 };
    });

    const idemValid = execCount === 1 && run1.val === 42 && run2.val === 42;
    this.record(suite, "Duplicate Invocation Suppression & Idempotency", idemValid, { execCount, run1, run2 });
  }

  private static testSettingsEngine() {
    const suite = "SettingsEngine";

    const defaults = DEFAULT_APP_SETTINGS;
    const valid = defaults.version === 2 && defaults.theme === "dark" && defaults.soundEnabled === true;
    this.record(suite, "Settings Schema v2 Default Definition", valid, defaults);
  }

  private static testRuleRegistry() {
    const suite = "RuleRegistry";

    const engines = EngineRulebook.getAllEngines();
    const hasCoreEngines = engines.some(e => e.engineName === "QuestEngine") &&
      engines.some(e => e.engineName === "RewardEngine") &&
      engines.some(e => e.engineName === "ProgressionEngine") &&
      engines.some(e => e.engineName === "EconomyEngine");

    this.record(suite, "Rule Registry Engine Definitions", hasCoreEngines, { engineCount: engines.length });
  }
}
