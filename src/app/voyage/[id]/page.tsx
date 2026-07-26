import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentIsland } from "@/lib/islandGame";
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
        include: {
            sea: true,
            islands: { orderBy: { sortOrder: "asc" }, include: { trials: { orderBy: { createdAt: "asc" } } } },
            progress: { where: { userId: session.user.id } },
        },
    });
    if (!voyage) return <div className="min-h-screen flex items-center justify-center treasure-map"><div className="text-center"><div className="text-6xl mb-4">🗺️</div><h1 className="text-2xl" style={{ color: "#F7C948" }}>Voyage Lost at Sea</h1><p className="text-amber-600 mb-4">This map seems to lead nowhere...</p><a href="/map" className="btn-pirate inline-block">← Back to Chart</a></div></div>;

    // Get the current island the student should be on
    const { island: currentIsland, islands } = await getCurrentIsland(session.user.id, id);
    const voyageProgress = voyage.progress[0];

    // If voyage already completed/mastered (e.g. skipped via Courage Challenge)
    const voyageDone = voyageProgress?.status === "Completed" || voyageProgress?.status === "Mastered";

    // If no current island (all done) but voyage not marked — mark it
    if (!currentIsland && !voyageDone) {
        // All islands complete — redirect to complete API
        const allTrials = islands.flatMap(i => i.trials);
        const totalTrials = allTrials.length;
        const completedTrials = voyageProgress?.trialsCompleted || 0;
        if (completedTrials >= totalTrials) {
            // Find the last island and complete the voyage
            const lastIsland = islands[islands.length - 1];
            return redirect(`/api/voyages/complete?direct=1&voyageId=${id}&islandId=${lastIsland?.id || ""}`);
        }
    }

    const locked = voyageProgress?.status === "Locked";

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

    if (voyageDone || !currentIsland) return (
        <div className="min-h-screen treasure-map flex items-center justify-center">
            <div className="text-center animate-cannon">
                <div className="text-8xl mb-6">🏆</div>
                <h2 className="text-3xl mb-2" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>
                    {voyageProgress?.status === "Mastered" ? "Master of the Seas!" : "Voyage Complete!"}
                </h2>
                <p className="text-amber-600 mb-8">Ye conquered "{voyage.title}"!</p>
                <a href="/map" className="btn-pirate">← Back to Chart</a>
            </div>
        </div>
    );

    const islandTrials = currentIsland.trials;
    const totalTrialsInIsland = islandTrials.length;
    const isExam = currentIsland.type === "courage_challenge" || currentIsland.type === "boss_fight";

    // Get island progress
    const islandProgress = await prisma.userIslandProgress.findUnique({
        where: { userId_islandId: { userId: session.user.id, islandId: currentIsland.id } },
    });

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <a href="/map" className="flex items-center gap-2 text-amber-600 hover:text-amber-400 transition"><span>←</span><span className="text-sm">Chart</span></a>
                    <div className="flex items-center gap-3"><span className="text-lg">{voyage.sea.icon}</span><h1 className="text-lg truncate max-w-[200px]" style={{ fontFamily: "'Pirata One',cursive" }}>{voyage.title}</h1>{voyage.captainGauntlet && <span>⚔️</span>}</div>
                    <div className="flex items-center gap-2 text-sm"><span>🔥 {streak?.currentStreak || 0}d</span></div>
                </div>
                <div className="h-1 bg-abyssal"><div className="h-full bg-gradient-to-r from-amber-600 to-yellow-500 transition-all duration-500" style={{ width: `${islandProgress ? (islandProgress.trialsCompleted / totalTrialsInIsland) * 100 : 0}%` }} /></div>
            </header>
            <TrialPlayer
                voyage={{ id: voyage.id, title: voyage.title, captainGauntlet: voyage.captainGauntlet, sea: voyage.sea, trials: islandTrials }}
                progress={islandProgress}
                isCompleted={islandProgress?.status === "Completed"}
                userId={session.user.id}
                charms={charms}
                hasFortuneWind={userData?.hasFortuneWind || false}
                islandId={currentIsland.id}
                islandType={currentIsland.type}
            />
            <TutorChat context={{
                voyageTitle: voyage.title,
                seaName: voyage.sea.name,
                subject: SEA_SUBJECTS[voyage.sea.name] || "General",
                trialIndex: islandProgress?.trialsCompleted || 0,
                totalTrials: totalTrialsInIsland,
                trialType: islandTrials[islandProgress?.trialsCompleted || 0]?.type || "unknown",
            }} />
        </div>
    );
}
