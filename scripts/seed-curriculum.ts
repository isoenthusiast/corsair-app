/**
 * Syllabus-Driven Curriculum Pipeline — v3.0
 * Run: npx tsx scripts/seed-curriculum.ts
 *
 * Parses IGCSE topic trees from CURRICULUM.md, creates voyages/islands/trials.
 * Requires DEEPSEEK_API_KEY for trial generation.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { chat } from "../src/lib/deepseek";

// ── IGCSE Topic Trees ──

interface TopicDef {
    voyageTitle: string;
    difficulty: number;
    islands: string[];
}

interface SeaDef {
    seaName: string;
    icon: string;
    topics: TopicDef[];
}

const SEAS: SeaDef[] = [
    {
        seaName: "Sea of Navigation",
        icon: "🧮",
        topics: [
            { voyageTitle: "Number", difficulty: 3, islands: ["Types of Numbers", "Multiples, Factors & Primes", "Squares, Cubes & Roots", "Reciprocals", "Reading & Ordering Numbers", "Operations with Numbers & Decimals", "Sets"] },
            { voyageTitle: "Algebra & Sequences", difficulty: 4, islands: ["Introduction to Algebra", "Simplifying Algebraic Fractions", "Algebraic Roots & Indices", "Expanding & Factorising Brackets", "Linear Equations", "Inequalities", "Rearranging Formulas", "Simultaneous Equations", "Sequences"] },
            { voyageTitle: "Coordinate Geometry & Graphs", difficulty: 4, islands: ["Coordinates & Straight Line Graphs", "Using Calculators for Graphs & Equations"] },
            { voyageTitle: "Geometry", difficulty: 4, islands: ["Symmetry & Shapes", "Basic Angle Properties", "Angles in Polygons & Parallel Lines", "Bearings", "Circle Theorems"] },
            { voyageTitle: "Lengths, Areas & Volumes", difficulty: 3, islands: ["Area & Perimeter", "Circles, Arcs & Sectors", "Volume & Surface Area", "Congruence & Similarity"] },
            { voyageTitle: "Pythagoras & Trigonometry", difficulty: 5, islands: ["Pythagoras", "Trigonometry"] },
            { voyageTitle: "Transformations", difficulty: 4, islands: ["Transformations"] },
            { voyageTitle: "Probability", difficulty: 4, islands: ["Introduction to Probability", "Probability Diagrams & Multiple Events"] },
            { voyageTitle: "Statistics", difficulty: 4, islands: ["Averages, Ranges & Comparing Data", "Statistical Diagrams", "Scatter Graphs & Correlation"] },
        ],
    },
    {
        seaName: "Sea of Brews",
        icon: "🔬",
        topics: [
            { voyageTitle: "Characteristics & Classification of Living Organisms", difficulty: 4, islands: ["Characteristics of Living Organisms", "Concept & Uses of Classification Systems"] },
            { voyageTitle: "Organisation of the Organism", difficulty: 4, islands: ["Cell Structure & Size of Specimens"] },
            { voyageTitle: "Movement into & out of Cells", difficulty: 4, islands: ["Diffusion, Osmosis & Active Transport"] },
            { voyageTitle: "Biological Molecules", difficulty: 4, islands: ["Biological Molecules"] },
            { voyageTitle: "Enzymes", difficulty: 4, islands: ["Enzymes"] },
            { voyageTitle: "Plant Nutrition", difficulty: 4, islands: ["Photosynthesis & Leaf Structure"] },
            { voyageTitle: "Human Nutrition", difficulty: 4, islands: ["Human Diet & Digestion"] },
            { voyageTitle: "Transport in Plants", difficulty: 4, islands: ["Transport in Plants"] },
            { voyageTitle: "Transport in Animals", difficulty: 5, islands: ["Circulatory Systems", "Heart & Blood Vessels"] },
            { voyageTitle: "Diseases & Immunity", difficulty: 5, islands: ["Diseases & Immunity"] },
            { voyageTitle: "Gas Exchange in Humans", difficulty: 4, islands: ["Gas Exchange in Humans"] },
            { voyageTitle: "Respiration", difficulty: 5, islands: ["Respiration"] },
            { voyageTitle: "Excretion in Humans", difficulty: 5, islands: ["Excretion in Humans"] },
            { voyageTitle: "Coordination & Response", difficulty: 5, islands: ["Coordination, Response & Homeostasis"] },
            { voyageTitle: "Drugs", difficulty: 5, islands: ["Drugs in Medicine"] },
            { voyageTitle: "Reproduction", difficulty: 5, islands: ["Reproduction in Plants & Humans"] },
            { voyageTitle: "Inheritance", difficulty: 5, islands: ["Inheritance, Genes & Cell Division"] },
            { voyageTitle: "Variation & Selection", difficulty: 5, islands: ["Variation & Natural Selection"] },
            { voyageTitle: "Organisms & Their Environment", difficulty: 4, islands: ["Energy & Feeding Relationships"] },
            { voyageTitle: "Human Influences on Ecosystems", difficulty: 5, islands: ["Human Impact: Biodiversity, Pollution & Conservation"] },
            { voyageTitle: "Biotechnology & Genetic Modification", difficulty: 5, islands: ["Biotechnology & Genetic Modification"] },
        ],
    },
    {
        seaName: "Sea of Cunning",
        icon: "📚",
        topics: [
            { voyageTitle: "Reading Comprehension", difficulty: 3, islands: ["Overview", "Comprehension", "Summary", "Short-Answer Questions", "Language Task", "Extended Response"] },
            { voyageTitle: "Writing Skills", difficulty: 4, islands: ["Directed Writing", "Composition"] },
            { voyageTitle: "Coursework", difficulty: 4, islands: ["Assignment 1", "Assignment 2", "Assignment 3"] },
        ],
    },
];

// ── AI Prompt ──

const SUBJECT_MAP: Record<string, string> = {
    "Sea of Cunning": "English Language Arts",
    "Sea of Navigation": "Mathematics",
    "Sea of Brews": "Science (Biology)",
    "Sea of Whispers": "Chinese / Languages",
};

function buildPrompt(sea: string, topic: string, island: string, difficulty: number, isExam: boolean, count: number, existing: string[]): string {
    const subject = SUBJECT_MAP[sea] || sea;
    const trialTypeMix = isExam
        ? "Mix of multi_choice, fill_blank, and open_ended questions. 6 multi_choice, 2 fill_blank, 2 open_ended."
        : "Mix of multi_choice, fill_blank, puzzle, and open_ended questions appropriate for the subject.";

    return `You are an expert educational content creator for "Corsair Academy", a pirate-themed learning platform for kids aged 10-16. Generate ${count} pirate-themed quiz questions for the following:

SUBJECT: ${subject}
TOPIC (Voyage): ${topic}
SUB-TOPIC (Island): ${island}
DIFFICULTY: ${difficulty}/5
QUESTION TYPES: ${trialTypeMix}

Rules:
- Every question must be pirate-themed with light framing (e.g., "Captain Redbeard has 24 gold coins...")
- Questions must be educationally rigorous for the topic
- Include: question, answer, explanation (1-2 sentences), hint (optional but recommended)
- Points: ${difficulty === 1 ? 5 : difficulty === 2 ? 10 : difficulty === 3 ? 15 : difficulty === 4 ? 20 : 25} per question
- multi_choice: 4 options (A/B/C/D), answer is the letter
- fill_blank: use "___" for the blank
- open_ended: describe 2-3 key concepts in the answer field
- No duplicate questions
- Age-appropriate language for difficulty ${difficulty}

EXISTING QUESTIONS (DO NOT DUPLICATE):
${existing.slice(0, 10).join("\n") || "None yet"}

Return ONLY a valid JSON array of objects. Each object:
{
  "type": "multi_choice" | "fill_blank" | "puzzle" | "open_ended",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],  // ONLY for multi_choice
  "answer": "The correct answer",
  "explanation": "Why this answer is correct, 1-2 sentences",
  "hint": "A helpful hint that nudges toward the answer",
  "points": ${difficulty === 1 ? 5 : difficulty === 2 ? 10 : difficulty === 3 ? 15 : difficulty === 4 ? 20 : 25},
  "difficulty": ${difficulty}
}`;
}

// ── Main ──

async function generateTrials(sea: string, topic: string, island: string, difficulty: number, isExam: boolean, count: number, existing: string[]) {
    const prompt = buildPrompt(sea, topic, island, difficulty, isExam, count, existing);
    const raw = await chat([
        { role: "system", content: "You are an expert educational content creator. Return ONLY valid JSON." },
        { role: "user", content: prompt },
    ], { temperature: isExam ? 0.6 : 0.8, maxTokens: 4096 });

    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }

    const trials = JSON.parse(cleaned) as Array<{
        type: string; question: string; options?: string[]; answer: string;
        explanation?: string; hint?: string; points?: number; difficulty?: number;
    }>;

    if (!Array.isArray(trials)) return [];

    const validTypes = ["multi_choice", "fill_blank", "puzzle", "open_ended"];
    return trials.filter(t => t.question && t.answer).map(t => ({
        ...t,
        type: validTypes.includes(t.type) ? t.type : "multi_choice",
        explanation: t.explanation || "",
        hint: t.hint || "",
        points: t.points || (difficulty === 1 ? 5 : difficulty === 2 ? 10 : difficulty === 3 ? 15 : difficulty === 4 ? 20 : 25),
        difficulty: difficulty,
    }));
}

async function main() {
    console.log("🏝️  Syllabus-Driven Curriculum Pipeline\n");
    console.log("⚠️  This will create voyages, islands, and trials from IGCSE syllabus data.");
    console.log("⚠️  Requires DEEPSEEK_API_KEY for AI trial generation.\n");

    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const generateOnly = args.includes("--generate-only"); // skip voyage/island creation, only generate trials
    const skipTrials = args.includes("--skip-trials"); // create structure only, no AI generation

    if (dryRun) console.log("🔍 DRY RUN — no changes will be made\n");

    let totalVoyages = 0;
    let totalIslands = 0;
    let totalTrials = 0;

    for (const seaDef of SEAS) {
        console.log(`\n${seaDef.icon} ${seaDef.seaName}`);

        // Find or create sea
        let sea = await prisma.sea.findFirst({ where: { name: seaDef.seaName } });
        if (!sea) {
            console.log(`  ⚠️  Sea "${seaDef.seaName}" not found in DB, skipping`);
            continue;
        }

        let prevVoyageId: string | null = null;

        for (let i = 0; i < seaDef.topics.length; i++) {
            const topic = seaDef.topics[i];
            console.log(`  📦 ${topic.voyageTitle} (${topic.islands.length} islands)`);

            // Check if voyage already exists
            let voyage = await prisma.voyage.findFirst({
                where: { seaId: sea.id, title: topic.voyageTitle },
            });

            if (!voyage && !dryRun) {
                voyage = await prisma.voyage.create({
                    data: {
                        title: topic.voyageTitle,
                        seaId: sea.id,
                        difficulty: topic.difficulty,
                        sortOrder: i,
                        description: `IGCSE topic: ${topic.voyageTitle}`,
                        lifecycle: "Draft",
                        requiredVoyageId: prevVoyageId,
                    },
                });
            }

            if (!voyage) {
                console.log(`    ⏭️  Would create (dry run)`);
                prevVoyageId = `placeholder-${i}`;
                continue;
            }

            // Create islands
            const islandDefs = [
                { title: "🏁 Courage Challenge", type: "courage_challenge" as const, sortOrder: 0 },
                ...topic.islands.map((isl, idx) => ({
                    title: isl,
                    type: "regular" as const,
                    sortOrder: idx + 1,
                })),
                { title: "👑 Boss Fight", type: "boss_fight" as const, sortOrder: topic.islands.length + 1 },
            ];

            for (const islDef of islandDefs) {
                const existing = await prisma.island.findFirst({
                    where: { voyageId: voyage.id, sortOrder: islDef.sortOrder },
                });

                if (!existing && !dryRun) {
                    const island = await prisma.island.create({
                        data: {
                            voyageId: voyage.id,
                            title: islDef.title,
                            type: islDef.type,
                            sortOrder: islDef.sortOrder,
                            description: islDef.type === "courage_challenge"
                                ? `Entry exam for "${topic.voyageTitle}" — 10 questions, 80% to skip`
                                : islDef.type === "boss_fight"
                                    ? `Exit exam for "${topic.voyageTitle}" — prove your mastery!`
                                    : `Sub-topic of "${topic.voyageTitle}"`,
                            syllabusTags: [`IGCSE-CIE-${seaDef.seaName.replace("Sea of ", "")}-${topic.voyageTitle.replace(/ /g, "-")}`],
                        },
                    });
                    totalIslands++;

                    // Generate trials for this island
                    if (!skipTrials && !generateOnly) {
                        const isExam = islDef.type === "courage_challenge" || islDef.type === "boss_fight";
                        const count = isExam ? 10 : 5;
                        try {
                            const trials = await generateTrials(seaDef.seaName, topic.voyageTitle, islDef.title, topic.difficulty, isExam, count, []);
                            for (const t of trials) {
                                await prisma.trial.create({
                                    data: {
                                        islandId: island.id,
                                        type: t.type as any,
                                        question: t.question,
                                        options: t.options || undefined,
                                        answer: t.answer,
                                        explanation: t.explanation,
                                        hint: t.hint,
                                        points: t.points || 10,
                                        difficulty: t.difficulty || topic.difficulty,
                                        aiGenerated: true,
                                    },
                                });
                            }
                            totalTrials += trials.length;
                            console.log(`    ✅ Island "${islDef.title}" — ${trials.length} trials`);
                        } catch (err: any) {
                            console.log(`    ❌ Island "${islDef.title}" — generation failed: ${err.message?.slice(0, 60)}`);
                        }
                    }
                } else if (!existing) {
                    console.log(`    ⏭️  Island "${islDef.title}" (dry run)`);
                }
            }

            totalVoyages++;
            prevVoyageId = voyage.id;
        }
    }

    console.log(`\n🎉 Pipeline complete!`);
    console.log(`   Voyages: ${totalVoyages}`);
    console.log(`   Islands: ${totalIslands}`);
    console.log(`   Trials: ${totalTrials}`);
    if (dryRun) console.log(`\n   (DRY RUN — nothing was saved)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
