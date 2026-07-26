import { prisma } from "@/lib/prisma";

const DEFAULT_ECONOMY = {
    crownRate: 0.5,
    shopPrices: { whisper_scroll: 20, storm_pass: 50, fortune_wind: 100, anchor_charm: 150 },
    upgradeCosts: [300, 500, 1000, 2000, 5000],
    rankXP: [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000],
};

export type EconomyConfig = {
    crownRate: number;
    shopPrices: Record<string, number>;
    upgradeCosts: number[];
    rankXP: number[];
};

export async function getEconomySettings(): Promise<EconomyConfig> {
    let settings = await prisma.economySettings.findFirst();
    if (!settings) {
        settings = await prisma.economySettings.create({ data: DEFAULT_ECONOMY });
    }
    return {
        crownRate: settings.crownRate,
        shopPrices: (settings.shopPrices as unknown) as Record<string, number>,
        upgradeCosts: (settings.upgradeCosts as unknown) as number[],
        rankXP: (settings.rankXP as unknown) as number[],
    };
}

const RANKS = ["Deckhand", "Swabbie", "Gunner", "Boatswain", "Quartermaster", "First Mate", "Captain", "Commodore", "Sea Lord"];

export function getRank(totalXP: number, rankXP: number[]) {
    let rank = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (totalXP >= rankXP[i]) { rank = RANKS[i]; break; }
    }
    const nextIdx = RANKS.indexOf(rank) + 1;
    const nextXP = nextIdx < rankXP.length ? rankXP[nextIdx] : rankXP[rankXP.length - 1];
    const currentXP = rankXP[RANKS.indexOf(rank)];
    const progress = nextXP > currentXP ? ((totalXP - currentXP) / (nextXP - currentXP)) * 100 : 100;
    return { rank, nextRank: nextIdx < RANKS.length ? RANKS[nextIdx] : null, progress, nextXP, currentXP };
}

export function getDefaultEconomy(): EconomyConfig {
    return DEFAULT_ECONOMY;
}
