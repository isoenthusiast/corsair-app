/**
 * DeepSeek API client (OpenAI-compatible endpoint).
 * Used for AI trial generation, grading, and tutor chat.
 */

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

interface DeepSeekMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface DeepSeekResponse {
    choices: { message: { content: string } }[];
}

export async function chat(messages: DeepSeekMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

    const model = process.env.DEEPSEEK_MODEL_PRO || "deepseek-v4-pro";

    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 4096,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`DeepSeek API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = (await res.json()) as DeepSeekResponse;
    return data.choices[0]?.message?.content || "";
}
