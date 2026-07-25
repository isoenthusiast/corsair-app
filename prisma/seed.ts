/// <reference lib="dom" />
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🏴‍☠️ Seeding Corsair Academy...\n");

    // ── Users ──
    const adminHash = await bcrypt.hash("admin123", 10);
    const teacherHash = await bcrypt.hash("teach123", 10);
    const parentHash = await bcrypt.hash("learning123", 10);
    const parent2Hash = await bcrypt.hash("parent456", 10);
    const kidHash = await bcrypt.hash("andrew123", 10);
    const kid2Hash = await bcrypt.hash("sally123", 10);

    const admin = await prisma.user.upsert({ where: { username: "admin" }, update: {}, create: { name: "Lord Admiral", username: "admin", passwordHash: adminHash, role: "Admin", crowns: 0 } });
    const teacher = await prisma.user.upsert({ where: { username: "teacher1" }, update: {}, create: { name: "Captain Teach", username: "teacher1", passwordHash: teacherHash, role: "Teacher", crowns: 0 } });
    const parent1 = await prisma.user.upsert({ where: { username: "parent" }, update: {}, create: { name: "Captain Parent", username: "parent", passwordHash: parentHash, role: "Parent", crowns: 0 } });
    const parent2 = await prisma.user.upsert({ where: { username: "parent2" }, update: {}, create: { name: "Quartermaster Parent", username: "parent2", passwordHash: parent2Hash, role: "Parent", crowns: 0 } });
    const andrew = await prisma.user.upsert({ where: { username: "andrew" }, update: {}, create: { name: "Andrew Wee", username: "andrew", passwordHash: kidHash, role: "Student", age: 10, crowns: 50, pirateRank: "Deckhand" } });
    const sally = await prisma.user.upsert({ where: { username: "sally" }, update: {}, create: { name: "Sally Swashbuckler", username: "sally", passwordHash: kid2Hash, role: "Student", age: 9, crowns: 30, pirateRank: "Deckhand" } });
    console.log("✅ Crew: 1 Admin, 1 Teacher, 2 Parents, 2 Students");

    // ── Classes ──
    const classA = await prisma.class.upsert({ where: { id: "class-pirate-101" }, update: {}, create: { id: "class-pirate-101", name: "Pirate Academy 101" } });
    await prisma.classTeacher.upsert({ where: { classId_teacherId: { classId: classA.id, teacherId: teacher.id } }, update: {}, create: { classId: classA.id, teacherId: teacher.id } });
    console.log("✅ Class: Pirate Academy 101 (Captain Teach)");

    // ── Student-Class Links ──
    await prisma.studentClass.upsert({ where: { studentId_classId: { studentId: andrew.id, classId: classA.id } }, update: {}, create: { studentId: andrew.id, classId: classA.id } });
    await prisma.studentClass.upsert({ where: { studentId_classId: { studentId: sally.id, classId: classA.id } }, update: {}, create: { studentId: sally.id, classId: classA.id } });
    console.log("✅ Students enrolled: Andrew + Sally in Pirate Academy 101");

    // ── Student-Parent Links ──
    await prisma.studentParent.upsert({ where: { studentId_parentId: { studentId: andrew.id, parentId: parent1.id } }, update: {}, create: { studentId: andrew.id, parentId: parent1.id } });
    await prisma.studentParent.upsert({ where: { studentId_parentId: { studentId: andrew.id, parentId: parent2.id } }, update: {}, create: { studentId: andrew.id, parentId: parent2.id } });
    await prisma.studentParent.upsert({ where: { studentId_parentId: { studentId: sally.id, parentId: parent1.id } }, update: {}, create: { studentId: sally.id, parentId: parent1.id } });
    console.log("✅ Parent links: Andrew(2 parents) + Sally(1 parent)");

    // ── Streaks & Charms ──
    await prisma.streak.upsert({ where: { userId: andrew.id }, update: {}, create: { userId: andrew.id, streakProtection: 2 } });
    for (const ct of ["whisper_scroll", "storm_pass", "fortune_wind", "anchor_charm"] as const) {
        await prisma.seaCharm.upsert({ where: { userId_type: { userId: andrew.id, type: ct } }, update: {}, create: { userId: andrew.id, type: ct, quantity: ct === "whisper_scroll" ? 3 : 1 } });
    }
    console.log("✅ Streak + 3 Whisper Scrolls, 1 each of other charms");

    // ── Ship Upgrades ──
    const shipUpgrades = [
        { id: "reinforced-hull", name: "Reinforced Hull", description: "+1 free hint per voyage", icon: "🛡️", cost: 300, sortOrder: 1 },
        { id: "crows-nest", name: "Crow's Nest", description: "Preview next trial type before starting", icon: "🔭", cost: 500, sortOrder: 2 },
        { id: "treasure-hold", name: "Treasure Hold", description: "+20% crowns from all activities", icon: "📦", cost: 1000, sortOrder: 3 },
        { id: "cannon-array", name: "Cannon Array", description: "Captain's Gauntlets give 2x rewards", icon: "💥", cost: 2000, sortOrder: 4 },
        { id: "phantom-sails", name: "Phantom Sails", description: "Streak freeze lasts 3 days instead of 1", icon: "👻", cost: 5000, sortOrder: 5 },
    ];
    for (const u of shipUpgrades) {
        await prisma.shipUpgrade.upsert({ where: { id: u.id }, update: {}, create: u });
    }
    console.log("✅ 5 Ship Upgrades at the Dock");

    // ── Achievements ──
    const achievements = [
        { id: "first-steps", name: "Maiden Voyage", description: "Complete your first trial", icon: "⚓", type: "exploration" as const, rarity: "Common" as const, threshold: 1 },
        { id: "getting-started", name: "Deckhand's Spirit", description: "Complete 10 trials", icon: "🏃", type: "exploration" as const, rarity: "Common" as const, threshold: 10 },
        { id: "challenge-hunter", name: "Trial Blazer", description: "Complete 50 trials", icon: "🎯", type: "exploration" as const, rarity: "Uncommon" as const, threshold: 50 },
        { id: "centurion", name: "Sea Centurion", description: "Complete 100 trials", icon: "💯", type: "exploration" as const, rarity: "Rare" as const, threshold: 100 },
        { id: "3-day-streak", name: "Fair Winds", description: "Sail for 3 days straight", icon: "🌬️", type: "streak" as const, rarity: "Common" as const, threshold: 3 },
        { id: "7-day-streak", name: "Trade Winds", description: "Sail for 7 days straight", icon: "📅", type: "streak" as const, rarity: "Uncommon" as const, threshold: 7 },
        { id: "30-day-streak", name: "Legendary Current", description: "Sail for 30 days straight", icon: "🌟", type: "streak" as const, rarity: "Epic" as const, threshold: 30 },
        { id: "perfect-score", name: "Dead Eye", description: "3-skull 5 consecutive trials", icon: "☠️", type: "mastery" as const, rarity: "Rare" as const, threshold: 5 },
        { id: "speed-demon", name: "Cannonball", description: "Complete a trial in under 15 seconds", icon: "💥", type: "speed" as const, rarity: "Uncommon" as const, threshold: 1 },
        { id: "math-master", name: "Master Navigator", description: "Complete all Sea of Navigation voyages", icon: "🧭", type: "mastery" as const, rarity: "Epic" as const, threshold: null },
        { id: "word-wizard", name: "Silver Tongue", description: "Complete all Sea of Cunning voyages", icon: "📚", type: "mastery" as const, rarity: "Epic" as const, threshold: null },
        { id: "science-explorer", name: "Master Alchemist", description: "Complete all Sea of Brews voyages", icon: "⚗️", type: "mastery" as const, rarity: "Epic" as const, threshold: null },
        { id: "mandarin-star", name: "Trade Ambassador", description: "Complete all Sea of Whispers voyages", icon: "🀄", type: "mastery" as const, rarity: "Epic" as const, threshold: null },
        { id: "no-hints", name: "True Grit", description: "Complete 20 trials with no hints", icon: "💪", type: "mastery" as const, rarity: "Rare" as const, threshold: 20 },
        { id: "legendary", name: "Sea Lord", description: "Earn all other achievements", icon: "👑", type: "exploration" as const, rarity: "Legendary" as const, threshold: null },
    ];
    for (const a of achievements) {
        await prisma.achievement.upsert({ where: { id: a.id }, update: {}, create: a });
    }
    console.log("✅ 15 Achievements on the Bounty Board");

    // ── 4 Seas ──
    const seaData = [
        { name: "Sea of Cunning", icon: "📚", description: "Silver-tongued pirates master words, wit & deception!", color: "#4F46E5", sortOrder: 1 },
        { name: "Sea of Whispers", icon: "🀄", description: "Ancient Eastern tongues unlock forbidden trade routes!", color: "#DC2626", sortOrder: 2 },
        { name: "Sea of Navigation", icon: "🧮", description: "Chart the stars, count the plunder, outsmart the navy!", color: "#059669", sortOrder: 3 },
        { name: "Sea of Brews", icon: "🔬", description: "Brew potions, survive storms, master the elements!", color: "#D97706", sortOrder: 4 },
    ];
    const seaRecords: Record<string, string> = {};
    for (const s of seaData) {
        const sea = await prisma.sea.upsert({ where: { name: s.name }, update: {}, create: s });
        seaRecords[s.name] = sea.id;
    }
    console.log("✅ 4 Seas charted");

    // ── Voyages & Trials ──
    const voyages: Array<{ title: string; description: string; difficulty: number; sea: string; captainGauntlet?: boolean; trials: Array<{ type: "multi_choice" | "fill_blank" | "puzzle" | "open_ended"; question: string; options?: string[]; answer: string; explanation: string; hint: string; points: number }> }> = [
        // ═══ SEA OF CUNNING (English) ═══
        {
            title: "Message in a Bottle", description: "Decode secret messages & master the alphabet!", difficulty: 1, sea: "Sea of Cunning", trials: [
                { type: "multi_choice", question: "Which letter follows 'A' in the pirate alphabet?", options: ["C", "B", "D", "E"], answer: "B", explanation: "A, B, C — B follows A like a loyal first mate! 🏴", hint: "Sing the alphabet shanty", points: 10 },
                { type: "fill_blank", question: "Complete the word: C _ T (a furry ship's cat)", answer: "A", explanation: "C-A-T! Every pirate ship needs a mouser. 🐱", hint: "First letter of the alphabet", points: 10 },
                { type: "multi_choice", question: "Which letter hisses like a sea serpent?", options: ["M", "S", "T", "R"], answer: "S", explanation: "Sssss! The sea serpent's warning. 🐍", hint: "Think of a snake sound", points: 10 },
                { type: "fill_blank", question: "How many letters guard the pirate code?", answer: "26", explanation: "26 letters from A to Z — the complete codex!", hint: "A number in the twenties", points: 15 },
                { type: "multi_choice", question: "Which be a vowel, sailor?", options: ["B", "P", "O", "T"], answer: "O", explanation: "A, E, I, O, U — the five vowel islands! O be one of 'em.", hint: "Vowels: A, E, I, O, U", points: 10 },
            ]
        },
        {
            title: "The Captain's Log", description: "Build words to write your own pirate tales!", difficulty: 2, sea: "Sea of Cunning", trials: [
                { type: "fill_blank", question: "D _ G (loyal companion on the seven seas)", answer: "O", explanation: "D-O-G! Every captain needs a sea dog! 🐕", hint: "Vowel between A and U", points: 10 },
                { type: "multi_choice", question: "Where does a pirate sleep after a long voyage?", options: ["Galley", "Captain's Quarters", "Crow's Nest", "Brig"], answer: "Captain's Quarters", explanation: "The Captain's Quarters — finest room on the ship! 🛏️", hint: "Where the CAPTAIN rests", points: 10 },
                { type: "fill_blank", question: "The sky and sea share this colour: B _ U E", answer: "L", explanation: "Blue — the colour of endless horizons! 🌊", hint: "12th letter of the alphabet", points: 10 },
                { type: "multi_choice", question: "Which word is spelled with proper pirate penmanship?", options: ["Treazure", "Treasur", "Treasure", "Treshure"], answer: "Treasure", explanation: "T-R-E-A-S-U-R-E — that's how you spell what we seek! 💰", hint: "Has 'sure' at the end", points: 15 },
                { type: "fill_blank", question: "Opposite of 'vast': S _ _ L L", answer: "M", explanation: "Small — even mighty pirates started small!", hint: "Starts with SM", points: 10 },
            ]
        },
        {
            title: "Parley & Persuasion", description: "Weave sentences to negotiate like a true diplomat!", difficulty: 3, sea: "Sea of Cunning", trials: [
                { type: "multi_choice", question: "Which be a proper sentence worthy of a quartermaster?", options: ["The ship", "Sails fast", "The ship sails fast", "Ship fast sails"], answer: "The ship sails fast", explanation: "A proper sentence needs both who (ship) and what it does (sails)! ⛵", hint: "Look for who + action", points: 15 },
                { type: "fill_blank", question: "Fill the verb: 'I ___ the seven seas.' (sail/row)", answer: "sail", explanation: "Sail the seven seas — the pirate's calling!", hint: "A 4-letter action on water", points: 15 },
                { type: "multi_choice", question: "Which word names a THING on a pirate ship?", options: ["Jump", "Stormy", "Anchor", "Quickly"], answer: "Anchor", explanation: "An anchor is a thing — a noun! Nouns are people, places, or things. ⚓", hint: "You can touch it", points: 10 },
                { type: "fill_blank", question: "Use the right word: '___ treasure is buried here.' (Their/There/They're)", answer: "Their", explanation: "'Their' shows it belongs to them — THEIR treasure. 'There' is a place. 'They're' means they are.", hint: "Shows ownership", points: 20 },
                { type: "multi_choice", question: "What mark ends a pirate's question?", options: [".", "!", "?", ","], answer: "?", explanation: "Every question demands an answer — mark it with ? ❓", hint: "You're asking something", points: 10 },
            ]
        },
        {
            title: "Silver Tongue Tavern", description: "Master the art of words — synonyms, antonyms & wordplay!", difficulty: 4, sea: "Sea of Cunning", trials: [
                { type: "multi_choice", question: "A synonym for 'fearsome':", options: ["Gentle", "Terrifying", "Sleepy", "Small"], answer: "Terrifying", explanation: "Fearsome means terrifying — like a pirate lord! 😱", hint: "Which word also means scary?", points: 15 },
                { type: "fill_blank", question: "The antonym (opposite) of 'stormy' is ___", answer: "calm", explanation: "Calm seas are a pirate's rare blessing. Opposite of stormy! ☀️", hint: "Peaceful waters", points: 10 },
                { type: "multi_choice", question: "Which word means 'a massive treasure'?", options: ["Pittance", "Hoard", "Trinket", "Scrap"], answer: "Hoard", explanation: "A hoard is a massive collection of treasure — what every pirate dreams of! 🪙", hint: "Think of a dragon's gold pile", points: 15 },
                { type: "fill_blank", question: "One who draws maps is a ___", answer: "cartographer", explanation: "A cartographer charts the unknown seas! 🗺️", hint: "Starts with 'carto' — meaning map", points: 15 },
                { type: "multi_choice", question: "What does 'insatiable' mean?", options: ["Easily satisfied", "Never satisfied", "Full", "Sleepy"], answer: "Never satisfied", explanation: "An insatiable thirst for adventure — never enough! Like a true corsair!", hint: "'In-' means not, 'satiable' means able to be satisfied", points: 15 },
            ]
        },
        {
            title: "The Corsair's Codex", description: "Read ancient pirate logs & write your own legend! BOSS LEVEL!", difficulty: 5, sea: "Sea of Cunning", captainGauntlet: true, trials: [
                { type: "multi_choice", question: "In a pirate tale, what do we call the main scoundrel?", options: ["The Setting", "The Protagonist", "The Chapter", "The Index"], answer: "The Protagonist", explanation: "The protagonist is the hero (or scoundrel) the story follows! 📖", hint: "The main character", points: 20 },
                { type: "fill_blank", question: "Every legend has a beginning, a middle, and an ___", answer: "end", explanation: "Beginning, middle, and end — the three parts of every great tale!", hint: "The final chapter", points: 15 },
                { type: "multi_choice", question: "What is the 'setting' of a pirate yarn?", options: ["The hero", "Where & when it happens", "The treasure", "The author"], answer: "Where & when it happens", explanation: "Setting = WHERE (a haunted cove) and WHEN (the Golden Age of Piracy)! 🏝️", hint: "Place + time", points: 20 },
                { type: "fill_blank", question: "A true account of a pirate's life, written by another, is a ___", answer: "biography", explanation: "A biography tells the true story of someone's life. Every Sea Lord deserves one!", hint: "'Bio' means life", points: 25 },
                { type: "open_ended", question: "Describe your pirate flag in 2-3 sentences. What symbols strike fear into your enemies?", answer: "", explanation: "A fearsome flag indeed! The Jolly Roger is born. 🏴‍☠️", hint: "Think skulls, swords, and sea monsters", points: 30 },
            ]
        },

        // ═══ SEA OF WHISPERS (Mandarin) ═══
        {
            title: "The Eastern Port", description: "Learn to greet traders in the Eastern tongue!", difficulty: 1, sea: "Sea of Whispers", trials: [
                { type: "multi_choice", question: "What does '你好' (nǐ hǎo) mean in the common tongue?", options: ["Farewell", "Greetings", "My thanks", "Forgive me"], answer: "Greetings", explanation: "你好 means 'Hello' — the first word of diplomacy! 👋", hint: "How you greet someone", points: 10 },
                { type: "fill_blank", question: "The word for 'I' in the Eastern tongue: ___ (wǒ)", answer: "wǒ", explanation: "Wǒ (我) — I, myself, the speaker. Every conversation starts with 'I'!", hint: "Sounds like 'waw'", points: 10 },
                { type: "multi_choice", question: "What does '谢谢' (xiè xiè) mean?", options: ["Hello", "Please", "Thank you", "Yes"], answer: "Thank you", explanation: "谢谢 — gratitude opens more ports than cannons! 🙏", hint: "Said when someone helps you", points: 10 },
                { type: "fill_blank", question: "'Farewell' in the Eastern tongue: ___ (zài jiàn)", answer: "再见", explanation: "再见 — 'see you again.' Even farewells promise return!", hint: "Literally 'again see'", points: 15 },
                { type: "multi_choice", question: "Which number be '一' (yī)?", options: ["1", "2", "3", "10"], answer: "1", explanation: "一 = 1. One horizontal stroke = one. The first number! 1️⃣", hint: "One line = one", points: 10 },
            ]
        },
        {
            title: "Treasure Counting", description: "Count your plunder — numbers 1 to 100!", difficulty: 2, sea: "Sea of Whispers", trials: [
                { type: "multi_choice", question: "What be 5 in the Eastern tongue?", options: ["三 (sān)", "四 (sì)", "五 (wǔ)", "六 (liù)"], answer: "五 (wǔ)", explanation: "五 = 5! Count: 一二三四五!", hint: "Sounds like 'woo'", points: 10 },
                { type: "fill_blank", question: "10 in the Eastern tongue: ___ (shí)", answer: "十", explanation: "十 = 10. Looks like a cross — where treasure is marked! ✚", hint: "Like a plus sign", points: 10 },
                { type: "multi_choice", question: "What be 二十 (èr shí)?", options: ["12", "20", "22", "10"], answer: "20", explanation: "二十 = two-ten = 20! The Eastern way: say how many tens.", hint: "Two tens", points: 15 },
                { type: "fill_blank", question: "二十五 (èr shí wǔ) = ? (write the number)", answer: "25", explanation: "二十五 = two-ten-five = 25. Logical!", hint: "2×10+5", points: 15 },
                { type: "multi_choice", question: "100 in the Eastern tongue:", options: ["十十", "一百 (yī bǎi)", "五十", "二十"], answer: "一百 (yī bǎi)", explanation: "一百 = one hundred. 百 means hundred!", hint: "One-hundred", points: 15 },
            ]
        },
        {
            title: "The Pirate Clan", description: "Speak of family, crew & friendship!", difficulty: 3, sea: "Sea of Whispers", trials: [
                { type: "multi_choice", question: "What does '妈妈' (mā ma) mean?", options: ["Father", "Mother", "Sister", "Grandmother"], answer: "Mother", explanation: "妈妈 — mother! Even pirates call home sometimes. 👩", hint: "The person who raised you", points: 10 },
                { type: "fill_blank", question: "'Father' in the Eastern tongue: ___ (bà ba)", answer: "爸爸", explanation: "爸爸 — father, the old captain. 👨", hint: "Same character twice", points: 10 },
                { type: "multi_choice", question: "How do you say 'I value you' (like 'I love you')?", options: ["你好", "谢谢", "我爱你 (wǒ ài nǐ)", "再见"], answer: "我爱你 (wǒ ài nǐ)", explanation: "我爱你 = I love/value you. The bond between crewmates! ❤️", hint: "Three words: I + love + you", points: 15 },
                { type: "fill_blank", question: "'Older brother' in the Eastern tongue: ___ (gē ge)", answer: "哥哥", explanation: "哥哥 — older brother, your first mate in training!", hint: "Repeated character", points: 15 },
                { type: "multi_choice", question: "What does '朋友' (péng yǒu) mean?", options: ["Family", "Friend", "Enemy", "Stranger"], answer: "Friend", explanation: "朋友 — friend! No pirate sails alone. 👫", hint: "Someone you trust at sea", points: 10 },
            ]
        },
        {
            title: "Trade Winds Market", description: "Haggle for supplies — food, colours & daily phrases!", difficulty: 4, sea: "Sea of Whispers", trials: [
                { type: "multi_choice", question: "What does '水' (shuǐ) mean?", options: ["Fire", "Water", "Rice", "Tea"], answer: "Water", explanation: "水 = water! The most precious resource at sea. 💧", hint: "Flows in rivers and seas", points: 10 },
                { type: "fill_blank", question: "Red — the colour of a pirate's flag: 红色 (___ sè)", answer: "hóng", explanation: "红色 = red! 红 is the colour of passion and danger. 🧧", hint: "Sounds like 'hong'", points: 15 },
                { type: "multi_choice", question: "What does '好吃' (hǎo chī) mean at the galley?", options: ["Good morning", "Delicious", "Hello", "Farewell"], answer: "Delicious", explanation: "好吃 = 'good eat' = delicious! The cook's highest praise! 😋", hint: "Said when food is great", points: 15 },
                { type: "fill_blank", question: "'I want to eat ___': 我想吃___(miàn)", answer: "面", explanation: "面 = noodles. A staple on long voyages! 🍜", hint: "A long, stringy food", points: 15 },
                { type: "multi_choice", question: "What time is '早上' (zǎo shang)?", options: ["Morning", "Noon", "Evening", "Midnight"], answer: "Morning", explanation: "早上 = morning! 早上好 = Good morning, sailor! ☀️", hint: "When the sun rises", points: 10 },
            ]
        },
        {
            title: "Ambassador's Summit", description: "Negotiate treaties & tell your tale! BOSS LEVEL!", difficulty: 5, sea: "Sea of Whispers", captainGauntlet: true, trials: [
                { type: "multi_choice", question: "Someone says '你好吗？' (How are you?). Your reply?", options: ["谢谢", "我很好 (wǒ hěn hǎo)", "再见", "是的"], answer: "我很好 (wǒ hěn hǎo)", explanation: "我很好 = I'm very good! The proper reply to 'How are you?'", hint: "I + very + good", points: 20 },
                { type: "fill_blank", question: "To ask a stranger's name: 你叫什么___? (míng zì)", answer: "名字", explanation: "名字 = name. 你叫什么名字？= What's your name?", hint: "Two characters: míng + zì", points: 20 },
                { type: "multi_choice", question: "What does '我是学生' (wǒ shì xué shēng) mean?", options: ["I am a captain", "I am a student", "I am lost", "I am hungry"], answer: "I am a student", explanation: "我是学生 = I am a student. Every Sea Lord was once a student! 📚", hint: "学 = learn/study", points: 20 },
                { type: "fill_blank", question: "'Joyful Celebration Day' (Happy Birthday): 生日___ (kuài lè)", answer: "快乐", explanation: "快乐 = happy! 生日快乐 = Birthday happy = Happy Birthday! 🎂", hint: "Two characters: kuài + lè", points: 20 },
                { type: "open_ended", question: "Introduce yourself in the Eastern tongue: Greetings, my name is ___, I am ___ years old. (Use pinyin or characters!)", answer: "", explanation: "你好，我叫___，我___岁。Magnificent! You're ready for the Eastern ports! 🎉", hint: "Start with 你好, then 我叫", points: 30 },
            ]
        },

        // ═══ SEA OF NAVIGATION (Maths) ═══
        {
            title: "Chart the Stars", description: "Count, compare & navigate by numbers!", difficulty: 1, sea: "Sea of Navigation", trials: [
                { type: "multi_choice", question: "5 doubloons + 3 doubloons = ?", options: ["6", "7", "8", "9"], answer: "8", explanation: "5+3=8! Count on yer fingers: 5,6,7,8!", hint: "Count 3 more from 5", points: 10 },
                { type: "fill_blank", question: "10 cannonballs - 4 fired = ?", answer: "6", explanation: "10 minus 4 equals 6. 6 cannonballs remain!", hint: "Count back from 10", points: 10 },
                { type: "multi_choice", question: "Which be the greater bounty: 47 or 74?", options: ["47", "74", "Equal", "Can't tell"], answer: "74", explanation: "74 has 7 tens. 47 only has 4 tens. Bigger bounty!", hint: "Compare the first digit", points: 10 },
                { type: "fill_blank", question: "2 ships × 5 cannons each = ?", answer: "10", explanation: "2×5=10 cannons! Count by 5s: 5, 10! 💥", hint: "Two groups of five", points: 15 },
                { type: "multi_choice", question: "What comes next: 2, 4, 6, 8, ___?", options: ["9", "10", "12", "14"], answer: "10", explanation: "Adding 2 each time. 8+2=10! Even numbers march on.", hint: "Skip count by 2s", points: 10 },
            ]
        },
        {
            title: "Plunder Addition", description: "Stack your treasure with bigger numbers!", difficulty: 2, sea: "Sea of Navigation", trials: [
                { type: "fill_blank", question: "23 chests + 15 chests = ?", answer: "38", explanation: "23+15=38. Add tens: 20+10=30. Add ones: 3+5=8. 30+8=38!", hint: "Add tens first, then ones", points: 15 },
                { type: "multi_choice", question: "50 crew + 50 marines = ?", options: ["90", "100", "110", "75"], answer: "100", explanation: "50+50=100! Half a crew plus half a crew = full navy! 💯", hint: "Two halves = whole", points: 10 },
                { type: "fill_blank", question: "45 maps + 28 charts = ?", answer: "73", explanation: "45+28=73. 45+20=65, 65+8=73! 🗺️", hint: "Add 20 first, then 8", points: 20 },
                { type: "multi_choice", question: "99 + 1 = ?", options: ["99", "100", "101", "98"], answer: "100", explanation: "99+1=100. One more makes a full century!", hint: "Just one more", points: 10 },
                { type: "fill_blank", question: "67 + ___ = 100 (complete the treasure)", answer: "33", explanation: "67+33=100. 67 needs 3 to reach 70, then 30 to reach 100. 3+30=33!", hint: "What plus 67 = 100?", points: 20 },
            ]
        },
        {
            title: "Subtraction Siege", description: "Calculate losses, find the difference!", difficulty: 3, sea: "Sea of Navigation", trials: [
                { type: "multi_choice", question: "100 crew - 35 lost in battle = ?", options: ["55", "65", "75", "45"], answer: "65", explanation: "100-35=65. Count up: 35→40(+5), 40→100(+60). 5+60=65!", hint: "Count UP from 35", points: 15 },
                { type: "fill_blank", question: "84 maps. 27 lost at sea. Remaining?", answer: "57", explanation: "84-27=57. 84-20=64, 64-7=57. Keep those maps dry! 🗺️", hint: "Subtract 20, then 7", points: 20 },
                { type: "multi_choice", question: "Distance between Isle A (200) and Isle B (156)?", options: ["44", "54", "46", "56"], answer: "44", explanation: "200-156=44 leagues. Count up: 156→160(+4), 160→200(+40). 4+40=44!", hint: "How far apart?", points: 20 },
                { type: "fill_blank", question: "500 doubloons - 123 spent at port = ?", answer: "377", explanation: "500-123=377. 500-100=400, 400-20=380, 380-3=377.", hint: "Subtract in parts", points: 20 },
                { type: "multi_choice", question: "Subtract a number from itself — what remains?", options: ["The number", "0", "1", "Double"], answer: "0", explanation: "Any number minus itself = zero! 7-7=0, 100-100=0. Nothing left.", hint: "7-7=?", points: 15 },
            ]
        },
        {
            title: "Multiplication Armada", description: "Times tables & fleet calculations!", difficulty: 4, sea: "Sea of Navigation", trials: [
                { type: "multi_choice", question: "7 ships × 8 cannons each = ?", options: ["54", "56", "58", "63"], answer: "56", explanation: "7×8=56! The tricky one: 5-6-7-8 (56=7×8)! 🔢", hint: "Digits are 5 and 6", points: 15 },
                { type: "fill_blank", question: "6 fleets × 9 ships = ?", answer: "54", explanation: "6×9=54. Think: 6×10=60, 60-6=54!", hint: "6×10=60, minus 6", points: 15 },
                { type: "multi_choice", question: "4 chests, 12 jewels each. Total jewels?", options: ["16", "40", "48", "36"], answer: "48", explanation: "4×12=48. 4×10=40, 4×2=8, 40+8=48! 💎", hint: "Multiply chests × jewels", points: 20 },
                { type: "fill_blank", question: "12×12 = ? (a gross of cannonballs!)", answer: "144", explanation: "12×12=144. A dozen dozens — a gross!", hint: "12 squared", points: 20 },
                { type: "multi_choice", question: "25×4 = ?", options: ["100", "50", "75", "125"], answer: "100", explanation: "25×4=100. Four quarters in a full treasure! 💵", hint: "Quarters in a dollar", points: 15 },
            ]
        },
        {
            title: "Division Depths", description: "Share the plunder, split the fleet! BOSS LEVEL!", difficulty: 5, sea: "Sea of Navigation", captainGauntlet: true, trials: [
                { type: "multi_choice", question: "144 jewels ÷ 12 crew = ?", options: ["10", "11", "12", "14"], answer: "12", explanation: "144÷12=12. Division is reversed multiplication: 12×12=144!", hint: "What × 12 = 144?", points: 20 },
                { type: "fill_blank", question: "96 gold coins shared among 8 pirates = ?", answer: "12", explanation: "96÷8=12. Each pirate gets 12 coins! Fair shares, no mutiny! 🪙", hint: "Divide 96 by 8", points: 20 },
                { type: "multi_choice", question: "1000 leagues ÷ 4 legs of journey = ?", options: ["200", "250", "300", "225"], answer: "250", explanation: "1000÷4=250. Halve twice: 1000→500→250!", hint: "Halve it twice", points: 20 },
                { type: "fill_blank", question: "If 7 × ? = 91, what's missing?", answer: "13", explanation: "91÷7=13. Check: 7×13=91! Unlucky 13 for some... ✅", hint: "Divide 91 by 7", points: 25 },
                { type: "open_ended", question: "8 treasure map pieces shared among 3 captains. How many each, and how many left for the crows? Explain!", answer: "", explanation: "8÷3 = 2 each, 2 remaining for the crows. Wise distribution!", hint: "8÷3 — what's the remainder?", points: 30 },
            ]
        },

        // ═══ SEA OF BREWS (Science) ═══
        {
            title: "Island Bestiary", description: "Discover the creatures of land and sea!", difficulty: 1, sea: "Sea of Brews", trials: [
                { type: "multi_choice", question: "What do island palms need to grow tall?", options: ["Only water", "Sunlight, water & air", "Only soil", "Only wind"], answer: "Sunlight, water & air", explanation: "Plants need sunlight, water, and air (CO₂) to brew their own food! 🌴", hint: "What would you give a potted plant?", points: 10 },
                { type: "fill_blank", question: "Beasts that eat only plants: ___", answer: "herbivores", explanation: "Herbivores — plant-eaters. The gentle giants of the isles! 🐄", hint: "'Herb' = plant", points: 15 },
                { type: "multi_choice", question: "Which sea creature is a warm-blooded beast (mammal)?", options: ["Shark", "Eagle Ray", "Dolphin", "Sea Turtle"], answer: "Dolphin", explanation: "Dolphins breathe air and nurse their young — mammals of the deep! 🐬", hint: "Breathes air, not water", points: 10 },
                { type: "fill_blank", question: "A caterpillar's transformation into a sky-sailor: ___", answer: "metamorphosis", explanation: "Metamorphosis — the magical change from crawler to flyer! 🦋", hint: "'Meta' = change, 'morph' = form", points: 20 },
                { type: "multi_choice", question: "What is the largest organ protecting a pirate's body?", options: ["Heart", "Brain", "Skin", "Liver"], answer: "Skin", explanation: "Skin covers your whole body — a pirate's natural armour! 🧍", hint: "It covers you head to toe", points: 15 },
            ]
        },
        {
            title: "Storm Chasers", description: "Volcanoes, maelstroms & the restless earth!", difficulty: 2, sea: "Sea of Brews", trials: [
                { type: "multi_choice", question: "What burns at the heart of the world?", options: ["Mantle", "Crust", "Core", "Magma"], answer: "Core", explanation: "Earth's layers: crust (skin), mantle (flesh), core (burning heart)! 🔥", hint: "Like an apple's centre", points: 15 },
                { type: "fill_blank", question: "Sky-water falling on the deck: ___", answer: "rain", explanation: "Rain — fresh water from the clouds. A gift at sea! 🌧️", hint: "You'd raise a sail against it", points: 10 },
                { type: "multi_choice", question: "Why do we have day and night at sea?", options: ["Sun hides", "Earth spins", "Moon blocks", "Clouds cover"], answer: "Earth spins", explanation: "Earth spins once every 24 hours — when your side faces the sun, it's day! 🌍", hint: "The world never stops turning", points: 15 },
                { type: "fill_blank", question: "Three forms of matter: solid, liquid, ___", answer: "gas", explanation: "Solid (ice), liquid (water), gas (steam) — the three faces of the sea! 🧊💧💨", hint: "Like steam from a kettle", points: 15 },
                { type: "multi_choice", question: "What rock is born from a volcano's fury?", options: ["Sandstone", "Marble", "Igneous", "Chalk"], answer: "Igneous", explanation: "Igneous rock — forged in fire, cooled from lava! 🌋", hint: "Comes from volcanoes", points: 15 },
            ]
        },
        {
            title: "Cannon Physics", description: "Push, pull, gravity & the forces of battle!", difficulty: 3, sea: "Sea of Brews", trials: [
                { type: "multi_choice", question: "What invisible force drags everything downward?", options: ["Magnetism", "Friction", "Gravity", "Wind"], answer: "Gravity", explanation: "Gravity — the Earth's grip. Keeps us on deck and cannonballs on target! 🌍", hint: "Why you don't float away", points: 10 },
                { type: "fill_blank", question: "The force that slows a sliding crate: ___", answer: "friction", explanation: "Friction — when surfaces rub together, they resist! Rub your hands: feel heat? 🔥", hint: "Rub your hands together", points: 15 },
                { type: "multi_choice", question: "Two north compass needles brought together will:", options: ["Attract", "Repel", "Spark", "Melt"], answer: "Repel", explanation: "Like poles repel! North-North pushes apart. North-South attracts. 🧭", hint: "Opposites attract", points: 15 },
                { type: "fill_blank", question: "On the Moon, you'd weigh ___ than on Earth. (more/less)", answer: "less", explanation: "Less! The Moon's gravity is weaker — you'd bounce like a skipping stone! 🌙", hint: "Moon has weaker pull", points: 10 },
                { type: "multi_choice", question: "Drop a cannonball and a feather (no air). Which lands first?", options: ["Cannonball", "Feather", "Both together", "Depends"], answer: "Both together", explanation: "Without air resistance, all objects fall at the same speed. Galileo proved it! 🪶⚽", hint: "Gravity pulls equally", points: 20 },
            ]
        },
        {
            title: "Alchemist's Galley", description: "Atoms, potions & the stuff of existence!", difficulty: 4, sea: "Sea of Brews", trials: [
                { type: "multi_choice", question: "What is everything made of — too small to see?", options: ["Energy", "Atoms", "Light", "Magic"], answer: "Atoms", explanation: "Atoms — tiny building blocks of ALL matter. The universe's LEGO! ⚛️", hint: "Smallest unit of matter", points: 10 },
                { type: "fill_blank", question: "Water's secret formula: Hydrogen + ___", answer: "Oxygen", explanation: "H₂O = 2 Hydrogen + 1 Oxygen = water! The alchemist's most basic brew. 💧", hint: "What we breathe", points: 15 },
                { type: "multi_choice", question: "What air do plants breathe IN?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"], answer: "Carbon Dioxide", explanation: "Plants breathe CO₂ and release oxygen. Forests are Earth's lungs! 🌳", hint: "The gas we breathe OUT", points: 15 },
                { type: "fill_blank", question: "Mix baking powder and vinegar — you've made a ___ reaction!", answer: "chemical", explanation: "The fizzing is a chemical reaction making CO₂ gas! Kitchen alchemy! 🧪", hint: "Fizzes and bubbles", points: 15 },
                { type: "multi_choice", question: "The pH of pure rainwater at sea:", options: ["0", "7", "14", "1"], answer: "7", explanation: "Pure water is pH 7 — perfectly neutral. Neither acidic nor basic.", hint: "Right in the middle", points: 20 },
            ]
        },
        {
            title: "The Star Compass", description: "Navigate by the heavens — astronomy & beyond! BOSS LEVEL!", difficulty: 5, sea: "Sea of Brews", captainGauntlet: true, trials: [
                { type: "multi_choice", question: "Which world is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], answer: "Mercury", explanation: "Mercury — the swift messenger, scorched by the Sun! ☿️", hint: "Named after a swift Roman god", points: 15 },
                { type: "fill_blank", question: "The Great Red Eye — a storm on which giant world?", answer: "Jupiter", explanation: "Jupiter's Great Red Spot — a storm bigger than Earth, raging for centuries! 🔴", hint: "Biggest planet", points: 20 },
                { type: "multi_choice", question: "What does 'light-year' measure?", options: ["Time", "Distance", "Brightness", "Speed"], answer: "Distance", explanation: "A light-year is DISTANCE — how far light travels in a year: 9.5 trillion km! 💫", hint: "It's a distance, not time", points: 20 },
                { type: "fill_blank", question: "Our galaxy — a spiral of stars: the ___ Way", answer: "Milky", explanation: "The Milky Way — our cosmic home. 100 billion stars strong! 🌌", hint: "Named after a creamy drink", points: 15 },
                { type: "open_ended", question: "If you discovered a new island, what would you name it and what natural wonders would it hold?", answer: "", explanation: "A magnificent discovery! Every explorer leaves their mark on the map. 🏝️", hint: "Think volcanoes, strange beasts, hidden coves", points: 30 },
            ]
        },
    ];

    let vCount = 0, tCount = 0;
    for (const v of voyages) {
        const seaId = seaRecords[v.sea];
        if (!seaId) continue;
        const voyage = await prisma.voyage.upsert({
            where: { id: `${v.sea.toLowerCase().replace(/\s+/g, "-")}-${v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
            update: {},
            create: {
                id: `${v.sea.toLowerCase().replace(/\s+/g, "-")}-${v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                title: v.title, description: v.description, seaId, difficulty: v.difficulty,
                captainGauntlet: v.captainGauntlet ?? false, sortOrder: vCount,
            },
        });
        vCount++;
        for (let i = 0; i < v.trials.length; i++) {
            const t = v.trials[i];
            await prisma.trial.upsert({
                where: { id: `${voyage.id}-trial-${i + 1}` },
                update: {},
                create: { id: `${voyage.id}-trial-${i + 1}`, voyageId: voyage.id, type: t.type, question: t.question, options: t.options ?? undefined, answer: t.answer, explanation: t.explanation, hint: t.hint, points: t.points, difficulty: v.difficulty, aiGenerated: false },
            });
            tCount++;
        }

        // Unlock first voyage of each sea
        const isFirst = (v.sea === "Sea of Cunning" && v.title === "Message in a Bottle") || (v.sea === "Sea of Whispers" && v.title === "The Eastern Port") || (v.sea === "Sea of Navigation" && v.title === "Chart the Stars") || (v.sea === "Sea of Brews" && v.title === "Island Bestiary");
        if (isFirst) {
            await prisma.userVoyageProgress.upsert({ where: { userId_voyageId: { userId: andrew.id, voyageId: voyage.id } }, update: { status: "Available" }, create: { userId: andrew.id, voyageId: voyage.id, status: "Available" } });
        }
    }
    console.log(`✅ ${vCount} voyages charted · ${tCount} trials ready`);

    // ── Assignment ──
    if (classA && teacher) {
        await prisma.assignment.upsert({ where: { id: "assign-msg-in-bottle" }, update: {}, create: { id: "assign-msg-in-bottle", voyageId: "sea-of-cunning-message-in-a-bottle", classId: classA.id, teacherId: teacher.id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        await prisma.announcement.upsert({ where: { id: "announce-welcome" }, update: {}, create: { id: "announce-welcome", classId: classA.id, teacherId: teacher.id, title: "Welcome Aboard, Crew!", body: "This week we set sail on the Sea of Cunning. Complete 'Message in a Bottle' by Friday to earn bonus crowns! 🏴‍☠️" } });
        console.log("✅ Assignment + Announcement created");
    }

    console.log("\n🏴‍☠️ Corsair Academy is ready for adventure!");
    console.log("   Admin:   admin / admin123");
    console.log("   Teacher: teacher1 / teach123");
    console.log("   Parent:  parent / learning123");
    console.log("   Student: andrew / andrew123  (50 🪙)");
    console.log("   Student: sally / sally123  (30 🪙)");
    console.log("   4 Seas:  Cunning 📚 | Whispers 🀄 | Navigation 🧮 | Brews 🔬");
    console.log("   Set sail at http://localhost:3200/map");
}

main().catch(e => { console.error("❌ Seed failed:", e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
