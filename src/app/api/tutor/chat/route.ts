import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";

const SYSTEM_PROMPT = `You are a friendly pirate tutor named "Captain Corsair" helping a young student (age 8-14) learn. 

RULES:
- Keep responses short (1-3 sentences)
- Use pirate language naturally (matey, arr, treasure, seas, etc.)
- Be encouraging and patient — never criticize
- If the student asks about a specific subject, give hints, not direct answers
- If the student seems frustrated, offer encouragement
- Stay in character as a pirate captain
- Use emojis occasionally (🏴‍☠️ 🗺️ ⚓ 🦜)
- Maximum response length: 150 words`;

export async function POST(request: NextRequest) {
    try {
        const { message, context } = await request.json();
        if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

        const ctxStr = context
            ? `\nCURRENT CONTEXT: The student is working on "${context.voyageTitle}" in the ${context.seaName} (${context.subject}). Trial ${context.trialIndex + 1} of ${context.totalTrials}. Question type: ${context.trialType}.`
            : "";

        const response = await chat(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: message + ctxStr },
            ],
            { temperature: 0.8, maxTokens: 300 }
        );

        return NextResponse.json({ reply: response.trim() });
    } catch (err: any) {
        console.error("Tutor chat failed:", err.message);
        return NextResponse.json({
            reply: "Arr, the seas be rough and me parrot's lost its voice! Try askin' again, matey. 🦜",
        });
    }
}
