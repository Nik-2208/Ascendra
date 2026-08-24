const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Seed Items (Shop)
  const itemsData = [
    {
      name: "Wooden Practice Sword",
      description: "A simple wooden sword to begin your focus training. Increases Strength gains slightly.",
      type: "EQUIPMENT",
      rarity: "Common",
      value: 50,
      imageUrl: "/items/wooden-sword.png"
    },
    {
      name: "Focus Elixir",
      description: "A magical brew that restores your energy and adds focus stat multiplier for 1 hour.",
      type: "CONSUMABLE",
      rarity: "Uncommon",
      value: 20,
      imageUrl: "/items/elixir.png"
    },
    {
      name: "Iron Blade of Productivity",
      description: "Forged in the fires of hard work. Grants +5 Strength and +2 Discipline.",
      type: "EQUIPMENT",
      rarity: "Rare",
      value: 250,
      imageUrl: "/items/iron-blade.png"
    },
    {
      name: "Shield of Discipline",
      description: "A heavy shield to guard against distractions. Grants +10 Health/Defense.",
      type: "EQUIPMENT",
      rarity: "Rare",
      value: 300,
      imageUrl: "/items/shield-discipline.png"
    },
    {
      name: "Consumable Energy Potion",
      description: "Restores energy instantly. Perfect for late-night questing.",
      type: "CONSUMABLE",
      rarity: "Common",
      value: 15,
      imageUrl: "/items/energy-potion.png"
    },
    {
      name: "Royal Crown of Accomplishment",
      description: "A prestigious cosmetic crown to show off your completionist status.",
      type: "COSMETIC",
      rarity: "Legendary",
      value: 1000,
      imageUrl: "/items/crown.png"
    }
  ];

  for (const item of itemsData) {
    await prisma.item.upsert({
      where: { id: item.name.toLowerCase().replace(/ /g, "_") },
      create: {
        id: item.name.toLowerCase().replace(/ /g, "_"),
        ...item
      },
      update: item
    });
  }
  console.log("Seeded shop items.");

  // 2. Seed Bosses
  const bossesData = [
    {
      id: "boss_snooze",
      name: "Snooze Button Behemoth",
      description: "An ancient giant that lulls warriors to sleep. Defeat him by waking up on time!",
      hp: 150,
      maxHp: 150,
      damage: 10,
      defense: 5,
      levelReq: 1,
      imageUrl: "/bosses/behemoth.png"
    },
    {
      id: "boss_procrastination",
      name: "Procrastination Dragon",
      description: "A massive dragon that breathes lazy mist. Defeat him by finishing your daily task lists!",
      hp: 500,
      maxHp: 500,
      damage: 25,
      defense: 15,
      levelReq: 3,
      imageUrl: "/bosses/dragon.png"
    },
    {
      id: "boss_imposter",
      name: "Imposter Syndrome Shadow",
      description: "A dark mirror reflection that whispers doubt. Defeat it by checking off achievements!",
      hp: 1200,
      maxHp: 1200,
      damage: 50,
      defense: 30,
      levelReq: 5,
      imageUrl: "/bosses/shadow.png"
    }
  ];

  for (const boss of bossesData) {
    await prisma.boss.upsert({
      where: { id: boss.id },
      create: boss,
      update: boss
    });
  }
  console.log("Seeded bosses.");

  // 3. Seed Achievements
  const achievementsData = [
    {
      id: "ach_first_steps",
      name: "First Steps",
      description: "Complete your onboarding setup and unlock your character profile.",
      isHidden: false,
      requirement: 1,
      metric: "ONBOARDING_COMPLETED",
      iconUrl: "star"
    },
    {
      id: "ach_quest_initiate",
      name: "Questing Initiate",
      description: "Complete 5 daily quests.",
      isHidden: false,
      requirement: 5,
      metric: "QUESTS_COMPLETED",
      iconUrl: "check-circle"
    },
    {
      id: "ach_streak_master",
      name: "Streak Master",
      description: "Achieve a streak of 7 check-ins.",
      isHidden: false,
      requirement: 7,
      metric: "MAX_STREAK",
      iconUrl: "zap"
    },
    {
      id: "ach_boss_slayer",
      name: "Boss Slayer",
      description: "Defeat your first boss in the Arena.",
      isHidden: false,
      requirement: 1,
      metric: "BOSS_DEFEATED",
      iconUrl: "sword"
    }
  ];

  for (const ach of achievementsData) {
    await prisma.achievement.upsert({
      where: { id: ach.id },
      create: ach,
      update: ach
    });
  }
  console.log("Seeded achievements.");
  // 4. Seed Quests
  const questsData = [
    {
      id: "quest_daily_water",
      title: "Hydration Hero",
      description: "Drink 8 glasses of water today.",
      type: "DAILY",
      xpReward: 50,
      coinReward: 20,
      isGlobal: true,
    },
    {
      id: "quest_daily_exercise",
      title: "Warrior's Warmup",
      description: "Do 20 minutes of physical exercise.",
      type: "DAILY",
      xpReward: 100,
      coinReward: 50,
      isGlobal: true,
    },
    {
      id: "quest_weekly_read",
      title: "Seeker of Knowledge",
      description: "Read a book for 2 hours this week.",
      type: "WEEKLY",
      xpReward: 300,
      coinReward: 150,
      isGlobal: true,
    },
    {
      id: "quest_story_origins",
      title: "The Journey Begins",
      description: "Complete your first day in Ascendra.",
      type: "STORY",
      xpReward: 500,
      coinReward: 200,
      isGlobal: true,
    }
  ];

  for (const quest of questsData) {
    await prisma.quest.upsert({
      where: { id: quest.id },
      create: quest,
      update: quest
    });
  }
  console.log("Seeded quests.");
}

main()
  .then(async () => {
    console.log("Seeding finished successfully!");
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
