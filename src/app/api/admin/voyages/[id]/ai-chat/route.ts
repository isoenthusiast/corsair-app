import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL_FLASH || "deepseek-chat";

const SYSTEM_PROMPT = `You are a curriculum design assistant for "Corsair Academy", a pirate-themed learning platform for kids aged 7-14.

Your job is to help an admin refine their request for generating or modifying educational trials (questions/exercises).

Rules:
1. Ask clarifying questions to understand exactly what the admin wants.
2. Be concise — 1-3 questions per response.
3. When the admin's intent is clear (they say "generate", "looks good", "go ahead", etc.), respond with exactly: "GENERATE_READY" followed by a brief summary of what will be generated.
4. Stay in character — use nautical/pirate metaphors where appropriate.
5. Never generate actual trial content until the admin confirms.`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!DEEPSEEK_API_KEY) {
        return NextResponse.json({ error: "AI features not configured" }, { status: 503 });
    }

    const { id } = await params;
    const { message, history } = await request.json();

    if (!message?.trim()) {
        return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Get voyage context for the AI
    const voyage = await prisma.voyage.findUnique({
        where: { id },
        select: { title: true, description: true, objectives: true, difficulty: true, sea: { select: { name: true } } },
    });

    if (!voyage) {
        return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
    }

    // Save user message to AIContext
    await prisma.aIContext.create({
        data: {
            userId: session.user.id,
            content: `**User:** ${message}`,
            appFeature: "trials",
            voyageId: id,
            seaId: null,
            isFinal: false,
        },
    });

    // Build messages for DeepSeek
    const messages: any[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
            role: "system",
            content: `Current voyage: "${voyage.title}" (${voyage.sea.name}, difficulty ${voyage.difficulty}/5). Description: ${voyage.description || "None"}. Objectives: ${voyage.objectives || "None"}.`,
        },
    ];

    // Add conversation history (last 10 messages)
    if (history && Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("DeepSeek API error:", err);
            return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || "Arr, me parrot's gone silent. Try again?";

        // Save AI response to AIContext
        await prisma.aIContext.create({
            data: {
                userId: session.user.id,
                content: `**AI:** ${aiMessage}`,
                appFeature: "trials",
                voyageId: id,
                seaId: null,
                isFinal: aiMessage.startsWith("GENERATE_READY"),
            },
        });

        return NextResponse.json({
            reply: aiMessage,
            readyToGenerate: aiMessage.startsWith("GENERATE_READY"),
        });
    } catch (error) {
        console.error("DeepSeek fetch error:", error);
        return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }
}
