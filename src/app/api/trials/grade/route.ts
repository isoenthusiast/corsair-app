import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";

const SYSTEM_PROMPT = `You are an encouraging pirate teacher grading a student's open-ended answer. The student is aged 8-14. 

Evaluate the student's answer against the expected answer. Return ONLY valid JSON:
{
  "correct": true or false,
  "skulls": 1-3 (3=excellent, 2=partial, 1=attempted),
  "feedback": "2-3 sentences of encouraging pirate-themed feedback. Be kind and specific."
}

RULES:
- If the answer captures the core concept, mark correct=true even if wording differs
- Skulls: 3 for complete understanding, 2 for partial, 1 for honest attempt
- feedback MUST be encouraging — never harsh, always supportive
- Use pirate language naturally (matey, sailor, treasure, etc.)
- If the answer is empty or nonsensical, correct=false, skulls=1
- Keep feedback to 2-3 sentences`;

export async function POST(request: NextRequest) {
    try {
        const { trialQuestion, expectedAnswer, studentAnswer } = await request.json();

        if (!trialQuestion || !expectedAnswer || studentAnswer === undefined) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Quick local check for empty answers
        if (!studentAnswer || studentAnswer.trim().length === 0) {
            return NextResponse.json({
                correct: false,
                skulls: 1,
                feedback: "Ye didn't write anything, sailor! Even a guess shows courage. Give it a try next time! 🏴‍☠️",
            });
        }

        const userPrompt = `QUESTION: ${trialQuestion}
EXPECTED ANSWER: ${expectedAnswer}
STUDENT ANSWER: ${studentAnswer}

Evaluate this student's answer.`;

        const raw = await chat(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            { temperature: 0.5, maxTokens: 512 }
        );

        let cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        }

        const result = JSON.parse(cleaned) as {
            correct: boolean;
            skulls: number;
            feedback: string;
        };

        return NextResponse.json({
            correct: result.correct ?? false,
            skulls: Math.min(3, Math.max(1, result.skulls || 1)),
            feedback: result.feedback || "Good effort, sailor!",
        });
    } catch (err: any) {
        console.error("AI grading failed:", err.message);
        // Fallback: mark as correct with generic feedback
        return NextResponse.json({
            correct: true,
            skulls: 2,
            feedback: "The seas be rough — our grading kraken took a nap! But yer answer shows ye tried. Well done, sailor! 🦑",
        });
    }
}
