import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";

const SYSTEM_PROMPT = `You are an expert educational content creator for "Corsair Academy", a pirate-themed learning platform for kids aged 8-14. Your job is to generate engaging, pirate-themed quiz questions (called "trials").

Each trial must follow this exact JSON format:
{
  "type": "multi_choice" | "fill_blank" | "puzzle",
  "question": "The question text, pirate-themed, age-appropriate",
  "options": ["A", "B", "C", "D"],  // ONLY for multi_choice, 4 options
  "answer": "The correct answer (option letter for multi_choice, word for fill_blank, solution for puzzle)",
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
- Mix types: roughly 50% multi_choice, 30% fill_blank, 20% puzzle
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

    const { id: voyageId } = await params;
    const { count } = await request.json();
    const numTrials = Math.min(count || 3, 5);

    const voyage = await prisma.voyage.findUnique({
        where: { id: voyageId },
        include: { sea: true, trials: { select: { question: true } } },
    });
    if (!voyage) return NextResponse.json({ error: "Voyage not found" }, { status: 404 });

    const existingQuestions = voyage.trials.map(t => t.question);
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
                    voyageId,
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
