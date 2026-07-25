import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const trialId = form.get("trialId") as string;
    const voyageId = form.get("voyageId") as string;
    const type = form.get("type") as string;
    const question = form.get("question") as string;
    const optionsRaw = form.get("options") as string;
    const answer = form.get("answer") as string;
    const explanation = form.get("explanation") as string;
    const hint = form.get("hint") as string;
    const points = parseInt(form.get("points") as string) || 10;
    const difficulty = parseInt(form.get("difficulty") as string) || 1;

    const oldTrial = await prisma.trial.findUnique({ where: { id: trialId } });
    const versionCount = await prisma.trialVersion.count({ where: { trialId } });

    // Save version before updating
    if (oldTrial) {
        await prisma.trialVersion.create({ data: { trialId, versionNumber: versionCount + 1, question: oldTrial.question, options: oldTrial.options as any, answer: oldTrial.answer, explanation: oldTrial.explanation, hint: oldTrial.hint, points: oldTrial.points, editedBy: "admin" } });
    }

    let options = undefined;
    if (optionsRaw) { try { options = JSON.parse(optionsRaw); } catch { } }

    await prisma.trial.update({ where: { id: trialId }, data: { type: type as any, question, options, answer, explanation, hint, points, difficulty } });
    redirect(`/admin/voyages/${voyageId}`);
}
