import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TrialPlayer } from "./TrialPlayer";
import TutorChat from "@/components/TutorChat";

const SEA_SUBJECTS: Record<string, string> = {
    "Sea of Cunning": "English/Language Arts",
    "Sea of Whispers": "Mandarin Chinese",
    "Sea of Navigation": "Mathematics",
    "Sea of Brews": "Science",
};

export default async function VoyagePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) redirect("/");
    const { id } = await params;

    const voyage = await prisma.voyage.findUnique({
        where: { id },
        include: { sea: true, trials: { orderBy: { createdAt: "asc" } }, progress: { where: { userId: session.user.id } } },
    });
    if (!voyage) return <div className="min-h-screen flex items-center justify-center treasure-map"><div className="text-center"><div className="text-6xl mb-4">🗺️</div><h1 className="text-2xl" style={{ color: "#F7C948" }}>Voyage Lost at Sea</h1><p className="text-amber-600 mb-4">This map seems to lead nowhere...</p><a href="/map" className="btn-pirate inline-block">← Back to Chart</a></div></div>;

    const progress = voyage.progress[0];
    const locked = progress?.status === "Locked";
    const done = progress?.status === "Completed" || progress?.status === "Mastered";
    const streak = await prisma.streak.findUnique({ where: { userId: session.user.id } });
    const userCharms = await prisma.seaCharm.findMany({ where: { userId: session.user.id } });
    const userData = await prisma.user.findUnique({ where: { id: session.user.id }, select: { hasFortuneWind: true } });
    const charms = {
        whisper_scroll: userCharms.find(c => c.type === "whisper_scroll")?.quantity || 0,
        storm_pass: userCharms.find(c => c.type === "storm_pass")?.quantity || 0,
        fortune_wind: userCharms.find(c => c.type === "fortune_wind")?.quantity || 0,
        anchor_charm: userCharms.find(c => c.type === "anchor_charm")?.quantity || 0,
    };

    if (locked) return <div className="min-h-screen flex items-center justify-center treasure-map"><div className="text-center"><div className="text-6xl mb-4">🔒</div><h1 className="text-2xl" style={{ color: "#F7C948" }}>Seas Ahead Are Treacherous!</h1><p className="text-amber-600 mb-4">Complete the previous voyage to unlock "{voyage.title}"</p><a href="/map" className="btn-pirate inline-block">← Back to Chart</a></div></div>;

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <a href="/map" className="flex items-center gap-2 text-amber-600 hover:text-amber-400 transition"><span>←</span><span className="text-sm">Chart</span></a>
                    <div className="flex items-center gap-3"><span className="text-lg">{voyage.sea.icon}</span><h1 className="text-lg truncate max-w-[200px]" style={{ fontFamily: "'Pirata One',cursive" }}>{voyage.title}</h1>{voyage.captainGauntlet && <span>⚔️</span>}</div>
                    <div className="flex items-center gap-2 text-sm"><span>🔥 {streak?.currentStreak || 0}d</span></div>
                </div>
                <div className="h-1 bg-abyssal"><div className="h-full bg-gradient-to-r from-amber-600 to-yellow-500 transition-all duration-500" style={{ width: `${progress ? (progress.trialsCompleted / voyage.trials.length) * 100 : 0}%` }} /></div>
            </header>
            <TrialPlayer voyage={voyage} progress={progress} isCompleted={done} userId={session.user.id} charms={charms} hasFortuneWind={userData?.hasFortuneWind || false} />
            <TutorChat context={{
                voyageTitle: voyage.title,
                seaName: voyage.sea.name,
                subject: SEA_SUBJECTS[voyage.sea.name] || "General",
                trialIndex: progress?.trialsCompleted || 0,
                totalTrials: voyage.trials.length,
                trialType: voyage.trials[progress?.trialsCompleted || 0]?.type || "unknown",
            }} />
        </div>
    );
}
