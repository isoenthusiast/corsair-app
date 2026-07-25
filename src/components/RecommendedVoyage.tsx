"use client";

import { useState, useEffect } from "react";

interface Recommendation {
    id: string;
    title: string;
    seaName: string;
    seaIcon: string;
    difficulty: number;
    reason: string;
}

interface SeaProgress {
    name: string;
    icon: string;
    completed: number;
    total: number;
    pct: number;
}

export default function RecommendedVoyage() {
    const [rec, setRec] = useState<Recommendation | null>(null);
    const [seas, setSeas] = useState<SeaProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/personalize/recommend")
            .then(r => r.json())
            .then(data => {
                setRec(data.recommended);
                setSeas(data.seaProgress || []);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return null;
    if (!rec) return null;

    return (
        <div className="sea-card p-4 mb-6 animate-map-unfold">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧠</span>
                <h3 className="text-sm font-bold" style={{ color: "#F7C948" }}>Recommended for You</h3>
            </div>

            {rec && (
                <a href={`/voyage/${rec.id}`} className="block p-3 rounded-lg bg-amber-900/20 border border-amber-700/30 hover:border-amber-500/50 transition">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium" style={{ color: "#F7C948" }}>{rec.seaIcon} {rec.title}</span>
                            <p className="text-xs text-amber-600 mt-1">{rec.reason}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-amber-600">{rec.seaName}</span>
                            <div className="text-xs mt-0.5">{"☠️".repeat(rec.difficulty)}</div>
                        </div>
                    </div>
                </a>
            )}

            {/* Per-sea progress */}
            <div className="mt-3 space-y-1">
                {seas.map(s => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                        <span className="w-5">{s.icon}</span>
                        <span className="w-20 text-amber-400 truncate">{s.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-abyssal overflow-hidden">
                            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${s.pct}%` }} />
                        </div>
                        <span className="text-amber-600 w-12 text-right">{s.completed}/{s.total}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
