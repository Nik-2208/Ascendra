const { QUEST_DIFFICULTY_POLICY, QUEST_ENGINE_CONSTANTS } = require("../src/lib/quest-engine/quest-taxonomy");

console.log("==================================================");
console.log("ASCENDRA ENGINE VALIDATION & VERIFICATION SUITE");
console.log("==================================================");

let total = 0;
let passed = 0;
let failed = 0;

function assert(name, condition, details) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}`, details);
  }
}

// 1. Reward Policy & Bounds
console.log("\n--- Testing Reward Policy Invariants ---");
assert("Daily Ration is strictly 10 XP & 20 Gold", 
  QUEST_ENGINE_CONSTANTS.DAILY_RATION.xp === 10 && QUEST_ENGINE_CONSTANTS.DAILY_RATION.coins === 20
);

assert("EASY Difficulty Bounds are [25-30 XP, 5-10 Gold]",
  QUEST_DIFFICULTY_POLICY.EASY.xpMin === 25 &&
  QUEST_DIFFICULTY_POLICY.EASY.xpMax === 30 &&
  QUEST_DIFFICULTY_POLICY.EASY.coinsMin === 5 &&
  QUEST_DIFFICULTY_POLICY.EASY.coinsMax === 10
);

assert("MEDIUM Difficulty Bounds are [55-60 XP, 15-25 Gold]",
  QUEST_DIFFICULTY_POLICY.MEDIUM.xpMin === 55 &&
  QUEST_DIFFICULTY_POLICY.MEDIUM.xpMax === 60 &&
  QUEST_DIFFICULTY_POLICY.MEDIUM.coinsMin === 15 &&
  QUEST_DIFFICULTY_POLICY.MEDIUM.coinsMax === 25
);

assert("HARD Difficulty Bounds are [75-100 XP, 30-50 Gold]",
  QUEST_DIFFICULTY_POLICY.HARD.xpMin === 75 &&
  QUEST_DIFFICULTY_POLICY.HARD.xpMax === 100 &&
  QUEST_DIFFICULTY_POLICY.HARD.coinsMin === 30 &&
  QUEST_DIFFICULTY_POLICY.HARD.coinsMax === 50
);

assert("Max Displayed XP is 100", QUEST_ENGINE_CONSTANTS.MAX_DISPLAYED_XP === 100);
assert("Max Awarded XP Hard Cap is 150", QUEST_ENGINE_CONSTANTS.MAX_AWARDED_XP === 150);

// Summary
console.log("\n==================================================");
console.log(`RESULTS: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL ENGINE TESTS PASSED WITH 100% SUCCESS!");
  process.exit(0);
}
