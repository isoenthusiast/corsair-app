import { prisma } from "@/lib/prisma";

/**
 * Log AI usage for cost tracking and budget monitoring.
 * Estimates token counts conservatively: ~4 chars per token.
 */
export async function logAIUsage(
    userId: string,
    feature: string,
    model: string,
    promptText: string,
    completionText: string,
) {
    try {
        const promptTokens = Math.ceil(promptText.length / 4);
        const completionTokens = Math.ceil(completionText.length / 4);
        // DeepSeek pricing (approx): $0.55/M input, $2.19/M output
        const cost = (promptTokens / 1_000_000) * 0.55 + (completionTokens / 1_000_000) * 2.19;

        await prisma.aIUsageLog.create({
            data: {
                userId,
                feature,
                model,
                promptTokens,
                completionTokens,
                cost,
            },
        });
    } catch {
        // Usage logging should never break the main flow
        console.error("[AIUsageLog] Failed to write:", feature);
    }
}
