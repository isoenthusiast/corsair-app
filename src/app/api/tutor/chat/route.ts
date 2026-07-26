import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/deepseek";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAIUsage } from "@/lib/aiUsage";

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
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Rate limit: 15 tutor messages per student per minute
        const rl = checkRateLimit(`tutor:${session.user.id}`, 15);
        if (!rl.allowed) {
            return NextResponse.json({ reply: "Whoa there, sailor! Ye be askin' too fast. Take a breath and try again. 🦜" });
        }

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

        // Log AI usage
        await logAIUsage(session.user.id, "tutor_chat", "deepseek-v4-pro", SYSTEM_PROMPT + message + ctxStr, response);

        return NextResponse.json({ reply: response.trim() });
    } catch (err: any) {
        console.error("Tutor chat failed:", err.message);
        return NextResponse.json({
            reply: "Arr, the seas be rough and me parrot's lost its voice! Try askin' again, matey. 🦜",
        });
    }
}
