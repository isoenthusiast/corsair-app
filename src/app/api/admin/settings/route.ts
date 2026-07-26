import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

const FEATURE_KEYS = ["aiGeneration", "aiTutor", "aiGrading", "shop", "registrations"] as const;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const category = form.get("category") as string;
    const current = await getSystemSettings();
    const settings = await prisma.systemSetting.findFirst();
    const id = settings?.id;
    if (!id) {
        await prisma.systemSetting.create({ data: current });
        return redirect("/admin/settings?ok=1");
    }

    if (category === "identity") {
        const appName = form.get("appName") as string;
        if (!appName || appName.length > 100) {
            return NextResponse.json({ error: "Invalid app name" }, { status: 400 });
        }
        await prisma.systemSetting.update({ where: { id }, data: { appName } });
        await logAudit(session.user.id, "settings_identity", undefined, `Changed app name to "${appName}"`);
    } else if (category === "maintenance") {
        const maintenanceMode = form.get("maintenanceMode") === "on";
        const maintenanceMessage = form.get("maintenanceMessage") as string;
        await prisma.systemSetting.update({ where: { id }, data: { maintenanceMode, maintenanceMessage } });
        await logAudit(session.user.id, "settings_maintenance", undefined, `Maintenance mode: ${maintenanceMode ? "ON" : "OFF"}`);
    } else if (category === "features") {
        const featureFlags = { ...current.featureFlags } as Record<string, boolean>;
        for (const key of FEATURE_KEYS) {
            featureFlags[key] = form.get(key) === "on";
        }
        await prisma.systemSetting.update({ where: { id }, data: { featureFlags } });
        await logAudit(session.user.id, "settings_features", undefined, `Updated feature flags`);
    }

    redirect("/admin/settings?ok=1");
}
