import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
    appName: "Corsair Academy",
    maintenanceMode: false,
    maintenanceMessage: "The ship is in dry dock for upgrades. Back soon!",
    featureFlags: { aiGeneration: true, aiTutor: true, aiGrading: true, shop: true, registrations: true },
};

export type FeatureFlag = "aiGeneration" | "aiTutor" | "aiGrading" | "shop" | "registrations";
export type SystemConfig = {
    appName: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    featureFlags: Record<FeatureFlag, boolean>;
};

export async function getSystemSettings(): Promise<SystemConfig> {
    let settings = await prisma.systemSetting.findFirst();
    if (!settings) {
        settings = await prisma.systemSetting.create({ data: DEFAULT_SETTINGS });
    }
    return {
        appName: settings.appName,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        featureFlags: (settings.featureFlags as unknown) as Record<FeatureFlag, boolean>,
    };
}

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
    const cfg = await getSystemSettings();
    return cfg.featureFlags[flag] ?? false;
}

export async function isMaintenanceMode(): Promise<{ enabled: boolean; message: string }> {
    const cfg = await getSystemSettings();
    return { enabled: cfg.maintenanceMode, message: cfg.maintenanceMessage };
}
