import { QUEST_DIFFICULTY_POLICY, QUEST_ENGINE_CONSTANTS } from "../src/lib/quest-engine/quest-taxonomy";
import { UnifiedRewardEngine } from "../src/lib/reward-engine/unified-reward-engine";
import { FailsafeGuard } from "../src/lib/failsafe/failsafe-guard";
import { DEFAULT_APP_SETTINGS } from "../src/lib/settings-engine/settings-engine";
import { EngineRulebook } from "../src/lib/rule-registry/engine-rulebook";

console.log("==================================================");
console.log("ASCENDRA BACKEND ENGINE TEST RUNNER");
console.log("==================================================");

let total = 0;
let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, details?: any) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}`, details);
  }
}

async function run() {
  // 1. Reward Policy & Bounds
  console.log("\n--- 1. Testing Reward Policy Invariants ---");
  assert("Daily Ration is strictly 10 XP & 20 Gold", 
    QUEST_ENGINE_CONSTANTS.DAILY_RATION.xp === 10 && QUEST_ENGINE_CONSTANTS.DAILY_RATION.coins === 20
  );

  assert("EASY Difficulty Bounds [25-30 XP, 5-10 Gold]",
    QUEST_DIFFICULTY_POLICY.EASY.xpMin === 25 &&
    QUEST_DIFFICULTY_POLICY.EASY.xpMax === 30 &&
    QUEST_DIFFICULTY_POLICY.EASY.coinsMin === 5 &&
    QUEST_DIFFICULTY_POLICY.EASY.coinsMax === 10
  );

  assert("MEDIUM Difficulty Bounds [55-60 XP, 15-25 Gold]",
    QUEST_DIFFICULTY_POLICY.MEDIUM.xpMin === 55 &&
    QUEST_DIFFICULTY_POLICY.MEDIUM.xpMax === 60 &&
    QUEST_DIFFICULTY_POLICY.MEDIUM.coinsMin === 15 &&
    QUEST_DIFFICULTY_POLICY.MEDIUM.coinsMax === 25
  );

  assert("HARD Difficulty Bounds [75-100 XP, 30-50 Gold]",
    QUEST_DIFFICULTY_POLICY.HARD.xpMin === 75 &&
    QUEST_DIFFICULTY_POLICY.HARD.xpMax === 100 &&
    QUEST_DIFFICULTY_POLICY.HARD.coinsMin === 30 &&
    QUEST_DIFFICULTY_POLICY.HARD.coinsMax === 50
  );

  assert("Max Displayed XP is 100", QUEST_ENGINE_CONSTANTS.MAX_DISPLAYED_XP === 100);
  assert("Max Awarded XP Hard Cap is 150", QUEST_ENGINE_CONSTANTS.MAX_AWARDED_XP === 150);

  // 2. Reward Breakdown & Cap Enforcement
  console.log("\n--- 2. Testing Centralized Reward Engine ---");
  const hugeBreakdown = UnifiedRewardEngine.calculateRewardBreakdown({
    baseXp: 100,
    baseCoins: 50,
    ascensionCount: 5
  });
  assert("Reward Breakdown applies displayed cap <= 100 XP", hugeBreakdown.finalXp <= 100);
  assert("Reward Breakdown transaction ID generated", !!hugeBreakdown.transactionId);

  // 3. Failsafe Concurrency & Idempotency
  console.log("\n--- 3. Testing Failsafe & Concurrency Guard ---");
  const lockKey = "test_lock_" + Math.random().toString(36).substring(7);
  const lock1 = FailsafeGuard.acquireLock(lockKey, 1000);
  const lock2 = FailsafeGuard.acquireLock(lockKey, 1000);
  FailsafeGuard.releaseLock(lockKey);
  const lock3 = FailsafeGuard.acquireLock(lockKey, 1000);
  FailsafeGuard.releaseLock(lockKey);
  assert("Mutual Exclusion Lock prevents race conditions", lock1 === true && lock2 === false && lock3 === true);

  let runCount = 0;
  const idemKey = "test_idem_" + Math.random().toString(36).substring(7);
  const res1 = await FailsafeGuard.runIdempotent(idemKey, 2000, async () => {
    runCount++;
    return { ok: true };
  });
  const res2 = await FailsafeGuard.runIdempotent(idemKey, 2000, async () => {
    runCount++;
    return { ok: true };
  });
  assert("Idempotency guard executes block only once", runCount === 1 && res1.ok === true && res2.ok === true);

  // 4. Settings Engine
  console.log("\n--- 4. Testing Versioned Settings Schema ---");
  assert("Settings v2 default values initialized", DEFAULT_APP_SETTINGS.version === 2 && DEFAULT_APP_SETTINGS.theme === "dark");

  // 5. Rule Registry
  console.log("\n--- 5. Testing Engine Rulebook Registry ---");
  const engines = EngineRulebook.getAllEngines();
  assert("Engines registered in rulebook", engines.length >= 8);

  console.log("\n==================================================");
  console.log(`RESULTS: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
  else {
    console.log("ALL ENGINE TESTS PASSED WITH 100% SUCCESS!");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
