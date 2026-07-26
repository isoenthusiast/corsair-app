import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAIUsage } from "@/lib/aiUsage";
import { logAudit } from "@/lib/audit";

const SYSTEM_PROMPT = `You are an expert educational content creator for "Corsair Academy", a pirate-themed learning platform for kids aged 8-14. Your job is to generate engaging, pirate-themed quiz questions (called "trials").

Each trial must follow this exact JSON format:
{
  "type": "multi_choice" | "fill_blank" | "puzzle" | "open_ended",
  "question": "The question text, pirate-themed, age-appropriate",
  "options": ["A", "B", "C", "D"],  // ONLY for multi_choice, 4 options
  "answer": "The correct answer (option letter for multi_choice, word for fill_blank, solution for puzzle, or expected concepts for open_ended)",
  "explanation": "Brief educational explanation of why this answer is correct, 1-2 sentences",
  "hint": "A helpful hint that nudges toward the answer without giving it away",
  "points": 10,
  "difficulty": 2
}

RULES:
- Every question must be pirate-themed (ships, treasure, sea, pirates, maps, islands, etc.)
- Multi-choice: 4 options, answer is the letter (A/B/C/D)
- Fill-blank: question contains "___" where the answer goes
- Puzzle: a short riddle or logic challenge
- Open-ended: a question requiring a written response. The "answer" field should describe 2-3 key concepts the student should mention.
- Mix types: roughly 40% multi_choice, 25% fill_blank, 15% puzzle, 20% open_ended
- Difficulty 1-5 (1=easiest, 5=hardest). Match the voyage difficulty.
- Points: 5-20, proportional to difficulty (5 easy, 10 medium, 15 hard, 20 expert)
- Explanations must teach something, not just restate the answer
- Hints must guide without revealing the answer
- Language must be age-appropriate for kids

Return ONLY a valid JSON array of trial objects. No markdown, no code fences, no extra text.`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Rate limit: 10 AI generations per admin per minute
    const rl = checkRateLimit(`ai-gen:${session.user.id}`, 10);
    if (!rl.allowed) {
        return NextResponse.json({ error: "Rate limit exceeded. Wait before generating more." }, { status: 429 });
    }

    const { id: voyageId } = await params;
    const { count, islandId } = await request.json();
    const numTrials = Math.min(count || 3, 5);

    // Determine target island (default to Island 1 — first monthly unit)
    let targetIslandId = islandId as string | undefined;
    if (!targetIslandId) {
        const firstMonthly = await prisma.island.findFirst({
            where: { voyageId, type: "regular" },
            orderBy: { sortOrder: "asc" },
        });
        targetIslandId = firstMonthly?.id;
    }
    if (!targetIslandId) return NextResponse.json({ error: "No islands found for this voyage" }, { status: 400 });

    const island = await prisma.island.findUnique({
        where: { id: targetIslandId },
        include: { trials: { select: { question: true } }, voyage: { include: { sea: true } } },
    });
    if (!island) return NextResponse.json({ error: "Island not found" }, { status: 404 });

    const existingQuestions = island.trials.map(t => t.question);
    const voyage = island.voyage;
    const subjectMap: Record<string, string> = {
        "Sea of Cunning": "English/Language Arts",
        "Sea of Whispers": "Mandarin Chinese",
        "Sea of Navigation": "Mathematics",
        "Sea of Brews": "Science",
    };
    const subject = subjectMap[voyage.sea.name] || "General Knowledge";

    const userPrompt = `Generate ${numTrials} pirate-themed quiz trials for the following voyage:

VOYAGE TITLE: ${voyage.title}
SUBJECT: ${subject}
DESCRIPTION: ${voyage.description || "None provided"}
OBJECTIVES: ${voyage.objectives || "None provided"}
DIFFICULTY: ${voyage.difficulty}/5

EXISTING QUESTIONS (DO NOT DUPLICATE):
${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") || "None yet"}

Generate exactly ${numTrials} trials. Vary the trial types.`;

    try {
        const raw = await chat([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ], { temperature: 0.8, maxTokens: 4096 });

        // Log AI usage
        await logAIUsage(session.user.id, "trial_generation", "deepseek-v4-pro", SYSTEM_PROMPT + userPrompt, raw);
        await logAudit(session.user.id, "ai_generate_trials", voyageId, `Generated ${numTrials} trials for "${voyage.title}"`);

        // Parse the response — handle both raw JSON and code-fenced JSON
        let cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        }

        const trials = JSON.parse(cleaned) as Array<{
            type: string;
            question: string;
            options?: string[];
            answer: string;
            explanation?: string;
            hint?: string;
            points?: number;
            difficulty?: number;
        }>;

        if (!Array.isArray(trials) || trials.length === 0) {
            return NextResponse.json({ error: "AI returned no trials" }, { status: 500 });
        }

        // Validate and save each trial
        const validTypes = ["multi_choice", "fill_blank", "puzzle", "open_ended"];
        let created = 0;

        for (const t of trials) {
            if (!t.question || !t.answer) continue;
            if (!validTypes.includes(t.type)) t.type = "multi_choice";

            await prisma.trial.create({
                data: {
                    islandId: targetIslandId,
                    type: t.type as any,
                    question: t.question,
                    options: t.options || undefined,
                    answer: t.answer,
                    explanation: t.explanation || "",
                    hint: t.hint || "",
                    points: t.points || 10,
                    difficulty: t.difficulty || voyage.difficulty,
                },
            });
            created++;
        }

        return NextResponse.json({ created, total: trials.length });
    } catch (err: any) {
        console.error("AI trial generation failed:", err.message);
        return NextResponse.json({ error: "AI generation failed: " + (err.message || "Unknown error") }, { status: 500 });
    }
}
