"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SeaData {
    id: string; name: string; icon: string;
    voyages: { id: string; title: string; difficulty: number; lifecycle: string; captainGauntlet: boolean; islandCount: number; preppedIslands: number; totalTrials: number }[];
}

interface IslandData {
    id: string; title: string; description: string | null; type: string; sortOrder: number;
    trials: { id: string; type: string; question: string; points: number; _count: { attempts: number; versions: number } }[];
}

interface VoyageDetail {
    id: string; title: string; description: string | null; difficulty: number; lifecycle: string;
    objectives: string | null; estimatedMinutes: number | null; tags: string[]; skills: string[];
    captainGauntlet: boolean; sea: { id: string; name: string; icon: string };
    islands: IslandData[];
}

interface TrialForm {
    id: string; type: string; question: string; options: string; answer: string;
    explanation: string; hint: string; points: number; sortOrder: number;
}

interface ChatMessage { role: "user" | "ai"; content: string; }

const TYPE_BADGES: Record<string, string> = { multi_choice: "📋", fill_blank: "✏️", puzzle: "🧩", open_ended: "📝" };

export default function VoyageCurriculumClient({ seas }: { seas: SeaData[] }) {
    const [expandedSeas, setExpandedSeas] = useState<Record<string, boolean>>({});
    const [selectedVoyageId, setSelectedVoyageId] = useState<string | null>(null);
    const [voyage, setVoyage] = useState<VoyageDetail | null>(null);
    const [loadingVoyage, setLoadingVoyage] = useState(false);

    // Trial edit modal
    const [editingTrial, setEditingTrial] = useState<TrialForm | null>(null);
    const [trialSaving, setTrialSaving] = useState(false);
    const [trialError, setTrialError] = useState("");

    // Voyage edit modal
    const [editingVoyage, setEditingVoyage] = useState(false);
    const [editVoyageTitle, setEditVoyageTitle] = useState("");
    const [editVoyageDesc, setEditVoyageDesc] = useState("");
    const [editVoyageStatus, setEditVoyageStatus] = useState("Draft");
    const [editVoyageDifficulty, setEditVoyageDifficulty] = useState(1);
    const [editVoyageObjectives, setEditVoyageObjectives] = useState("");
    const [editVoyageMinutes, setEditVoyageMinutes] = useState("");
    const [editVoyageGauntlet, setEditVoyageGauntlet] = useState(false);
    const [editVoyageTags, setEditVoyageTags] = useState("");
    const [editVoyageSkills, setEditVoyageSkills] = useState("");
    const [voyageSaving, setVoyageSaving] = useState(false);
    const [voyageError, setVoyageError] = useState("");

    // AI Chat
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [readyToGenerate, setReadyToGenerate] = useState(false);
    const [generating, setGenerating] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Island state
    const [selectedIslandIdx, setSelectedIslandIdx] = useState(0);
    const [preppingAll, setPreppingAll] = useState(false);
    const [prepProgress, setPrepProgress] = useState("");

    // Expand first sea by default
    useEffect(() => {
        if (seas.length > 0) {
            setExpandedSeas(prev => ({ ...prev, [seas[0].id]: true }));
        }
    }, []);

    // Load voyage detail
    async function selectVoyage(id: string) {
        setSelectedVoyageId(id);
        setSelectedIslandIdx(0);
        setLoadingVoyage(true);
        setChatMessages([]);
        setReadyToGenerate(false);

        const res = await fetch(`/api/admin/voyages/${id}`);
        if (res.ok) {
            const data = await res.json();
            setVoyage(data.voyage);
        }
        setLoadingVoyage(false);
    }

    function toggleSea(seaId: string) {
        setExpandedSeas(prev => ({ ...prev, [seaId]: !prev[seaId] }));
    }

    // ── Trial Edit ──
    function openTrialEdit(trial: IslandData["trials"][0]) {
        setEditingTrial({
            id: trial.id, type: trial.type, question: trial.question,
            options: "", answer: "", explanation: "", hint: "",
            points: trial.points, sortOrder: 0,
        });
        setTrialError("");
    }

    async function saveTrial() {
        if (!editingTrial || !editingTrial.question.trim()) {
            setTrialError("Question is required");
            return;
        }
        setTrialSaving(true);
        setTrialError("");

        const res = await fetch("/api/admin/trials/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingTrial),
        });

        if (res.ok) {
            setEditingTrial(null);
            if (selectedVoyageId) selectVoyage(selectedVoyageId);
        } else {
            setTrialError("Failed to save trial");
        }
        setTrialSaving(false);
    }

    // ── Voyage Edit ──
    function openVoyageEdit() {
        if (!voyage) return;
        setEditingVoyage(true);
        setEditVoyageTitle(voyage.title);
        setEditVoyageDesc(voyage.description || "");
        setEditVoyageStatus(voyage.lifecycle);
        setEditVoyageDifficulty(voyage.difficulty);
        setEditVoyageObjectives(voyage.objectives || "");
        setEditVoyageMinutes(voyage.estimatedMinutes ? String(voyage.estimatedMinutes) : "");
        setEditVoyageGauntlet(voyage.captainGauntlet);
        setEditVoyageTags((voyage.tags || []).join(", "));
        setEditVoyageSkills((voyage.skills || []).join(", "));
        setVoyageError("");
    }

    async function saveVoyage() {
        if (!selectedVoyageId || !editVoyageTitle.trim()) return;
        setVoyageSaving(true);
        setVoyageError("");

        const res = await fetch("/api/admin/voyages/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                voyageId: selectedVoyageId,
                title: editVoyageTitle,
                description: editVoyageDesc,
                lifecycle: editVoyageStatus,
                difficulty: editVoyageDifficulty,
                objectives: editVoyageObjectives,
                estimatedMinutes: editVoyageMinutes ? parseInt(editVoyageMinutes) : null,
                captainGauntlet: editVoyageGauntlet,
                tags: editVoyageTags.split(",").map(t => t.trim()).filter(Boolean),
                skills: editVoyageSkills.split(",").map(s => s.trim()).filter(Boolean),
            }),
        });

        if (res.ok) {
            setEditingVoyage(false);
            selectVoyage(selectedVoyageId);
        } else {
            setVoyageError("Failed to save voyage");
        }
        setVoyageSaving(false);
    }

    // ── AI Chat ──
    async function sendChatMessage() {
        if (!chatInput.trim() || !selectedVoyageId || chatLoading) return;
        const msg = chatInput.trim();
        setChatInput("");
        setChatMessages(prev => [...prev, { role: "user", content: msg }]);
        setChatLoading(true);

        try {
            const res = await fetch(`/api/admin/voyages/${selectedVoyageId}/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, history: chatMessages }),
            });

            if (res.ok) {
                const data = await res.json();
                setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
                if (data.readyToGenerate) setReadyToGenerate(true);
            } else {
                setChatMessages(prev => [...prev, { role: "ai", content: "⚓ Shiver me timbers! The AI be unavailable. Try again later." }]);
            }
        } catch {
            setChatMessages(prev => [...prev, { role: "ai", content: "⚓ Connection lost at sea. Try again." }]);
        }
        setChatLoading(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    async function generateTrials() {
        if (!selectedVoyageId) return;
        setGenerating(true);
        try {
            const res = await fetch(`/api/admin/voyages/${selectedVoyageId}/generate-trials`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: 5 }),
            });
            if (res.ok) {
                setChatMessages(prev => [...prev, { role: "ai", content: "🏴‍☠️ Trials generated successfully!" }]);
                setReadyToGenerate(false);
                selectVoyage(selectedVoyageId);
            }
        } catch { /* ignore */ }
        setGenerating(false);
    }

    async function generateForIsland(islandId: string, count?: number) {
        if (!selectedVoyageId) return;
        setGenerating(true);
        try {
            const res = await fetch(`/api/admin/voyages/${selectedVoyageId}/generate-trials`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: count || 5, islandId }),
            });
            if (res.ok) selectVoyage(selectedVoyageId);
        } catch { /* ignore */ }
        setGenerating(false);
    }

    async function prepAllIslands() {
        if (!voyage || preppingAll) return;
        setPreppingAll(true);
        const emptyIslands = voyage.islands.filter(i => i.trials.length === 0);
        for (let i = 0; i < emptyIslands.length; i++) {
            const isl = emptyIslands[i];
            const isExam = isl.type === "courage_challenge" || isl.type === "boss_fight";
            setPrepProgress(`Generating for island ${isl.sortOrder} (${i + 1}/${emptyIslands.length})...`);
            try {
                await fetch(`/api/admin/voyages/${selectedVoyageId}/generate-trials`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ count: isExam ? 10 : 5, islandId: isl.id }),
                });
            } catch { /* continue */ }
        }
        setPrepProgress("");
        setPreppingAll(false);
        selectVoyage(selectedVoyageId!);
    }

    // ── Render ──
    return (
        <div className="min-h-screen treasure-map flex flex-col">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10 shrink-0">
                <div className="px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400">
                        <span>←</span><span className="text-sm">Admiral</span>
                    </Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🗺️ Manage Curriculum</h1>
                    <div className="w-20" />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* ── LEFT PANEL: Navigation ── */}
                <aside className="w-72 shrink-0 border-r border-amber-900/30 bg-abyssal/60 overflow-y-auto p-3">
                    {seas.length === 0 ? (
                        <p className="text-amber-600 text-sm text-center py-8">No seas created yet</p>
                    ) : (
                        seas.map(sea => (
                            <div key={sea.id} className="mb-2">
                                <button
                                    onClick={() => toggleSea(sea.id)}
                                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-900/20 transition"
                                >
                                    <span className="text-sm">{expandedSeas[sea.id] ? "▼" : "▶"}</span>
                                    <span className="text-sm">{sea.icon}</span>
                                    <span className="text-sm font-medium" style={{ color: "#F7C948" }}>{sea.name}</span>
                                    <span className="text-xs text-amber-600 ml-auto">{sea.voyages.length}</span>
                                </button>

                                {expandedSeas[sea.id] && (
                                    <div className="ml-6 mt-1 space-y-0.5">
                                        {sea.voyages.length === 0 ? (
                                            <p className="text-xs text-amber-800 py-1">No voyages in this sea</p>
                                        ) : (
                                            sea.voyages.map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => selectVoyage(v.id)}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-2 ${selectedVoyageId === v.id ? "bg-amber-800/40 border border-amber-600/30" : "hover:bg-amber-900/20"}`}
                                                >
                                                    <span className={`px-1 py-0.5 rounded text-xs ${v.lifecycle === "Published" ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/30 text-amber-400"}`}>
                                                        {v.lifecycle || "Draft"}
                                                    </span>
                                                    <span className="truncate flex-1">{v.title}</span>
                                                    {v.captainGauntlet && <span>⚔️</span>}
                                                    <span className="text-amber-700 text-xs">{v.preppedIslands}/{v.islandCount} 🏝️</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </aside>

                {/* ── RIGHT PANEL: Detail + Trials + AI ── */}
                <main className="flex-1 overflow-y-auto p-4">
                    {!selectedVoyageId ? (
                        <div className="flex items-center justify-center h-full text-amber-600">
                            <div className="text-center">
                                <div className="text-5xl mb-4">🗺️</div>
                                <p className="text-lg">Select a voyage from the left</p>
                                <p className="text-sm text-amber-800 mt-1">Click any voyage to view and manage its trials</p>
                            </div>
                        </div>
                    ) : loadingVoyage ? (
                        <div className="text-center text-amber-600 py-16">Loading voyage...</div>
                    ) : voyage ? (
                        <div className="max-w-3xl">
                            {/* Voyage Header */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm text-amber-600">{voyage.sea.icon} {voyage.sea.name}</span>
                                    {voyage.captainGauntlet && <span className="text-sm">⚔️ Gauntlet</span>}
                                    <button onClick={openVoyageEdit} className="ml-auto text-xs px-3 py-1 rounded-lg bg-amber-900/30 text-amber-400 hover:bg-amber-800/40 transition">
                                        ✏️ Edit Voyage
                                    </button>
                                </div>
                                <h2 className="text-2xl mb-2" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>{voyage.title}</h2>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">{voyage.lifecycle}</span>
                                    <span className="text-amber-600">Difficulty: {"☠️".repeat(voyage.difficulty)}</span>
                                    {voyage.estimatedMinutes && <span className="text-amber-600">~{voyage.estimatedMinutes} min</span>}
                                </div>
                                {voyage.description && <p className="text-sm text-amber-300 mt-2">{voyage.description}</p>}
                                {voyage.objectives && <p className="text-xs text-amber-600 mt-1">🎯 {voyage.objectives}</p>}
                                {voyage.tags.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {voyage.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-400 text-xs">{t}</span>)}
                                    </div>
                                )}
                            </div>

                            {/* Island Tabs */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold" style={{ color: "#F7C948" }}>🏝️ Islands</h3>
                                    <button
                                        onClick={prepAllIslands}
                                        disabled={preppingAll}
                                        className="text-xs px-3 py-1 rounded-lg bg-purple-900/30 border border-purple-600/30 text-purple-300 hover:bg-purple-900/50 disabled:opacity-50 transition"
                                    >
                                        {preppingAll ? "⏳ Prepping..." : "⚡ Prep All Islands"}
                                    </button>
                                </div>
                                {prepProgress && <p className="text-xs text-purple-400 mb-2">{prepProgress}</p>}
                                <div className="flex gap-1 overflow-x-auto pb-1">
                                    {voyage.islands.map((isl, i) => {
                                        const isExam = isl.type === "courage_challenge" || isl.type === "boss_fight";
                                        const hasTrials = isl.trials.length > 0;
                                        return (
                                            <button
                                                key={isl.id}
                                                onClick={() => setSelectedIslandIdx(i)}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition flex items-center gap-1 border ${selectedIslandIdx === i
                                                    ? "bg-amber-800/40 border-amber-600/50 text-amber-300"
                                                    : "bg-abyssal/50 border-amber-900/20 text-amber-600 hover:border-amber-700/40"
                                                    }`}
                                            >
                                                <span>{i === 0 ? "🏁" : i === 12 ? "👑" : i}</span>
                                                <span className={hasTrials ? "" : "opacity-40"}>{hasTrials ? "●" : "○"}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Selected Island Info */}
                                {voyage.islands[selectedIslandIdx] && (
                                    <div className="mt-2 p-2 rounded-lg bg-abyssal/30 text-xs text-amber-600">
                                        <span className="font-bold" style={{ color: "#F7C948" }}>
                                            {voyage.islands[selectedIslandIdx].title}
                                        </span>
                                        <span className="mx-2">·</span>
                                        <span>{voyage.islands[selectedIslandIdx].type.replace(/_/g, " ")}</span>
                                        <span className="mx-2">·</span>
                                        <span>{voyage.islands[selectedIslandIdx].trials.length} trials</span>
                                        {voyage.islands[selectedIslandIdx].description && (
                                            <p className="mt-1 text-amber-700">{voyage.islands[selectedIslandIdx].description}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Trials List — scoped to selected island */}
                            {(() => {
                                const selIsland = voyage.islands[selectedIslandIdx];
                                if (!selIsland) return null;
                                const isExam = selIsland.type === "courage_challenge" || selIsland.type === "boss_fight";
                                return (
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>
                                                ⚔️ Trials ({selIsland.trials.length}{isExam ? "/10" : ""})
                                            </h3>
                                            <button
                                                onClick={() => generateForIsland(selIsland.id, isExam ? 10 : undefined)}
                                                disabled={generating}
                                                className="text-xs px-3 py-1 rounded-lg bg-purple-900/30 border border-purple-600/50 text-purple-300 hover:bg-purple-900/50 disabled:opacity-50 transition"
                                            >
                                                {generating ? "🤖..." : `🤖 Generate ${isExam ? "10" : "3-5"}`}
                                            </button>
                                        </div>
                                        {selIsland.trials.length === 0 ? (
                                            <div className="p-6 rounded-xl bg-abyssal/50 border border-amber-900/20 text-center">
                                                <p className="text-amber-600 text-sm">No trials yet</p>
                                                <p className="text-amber-800 text-xs mt-1">Click "Generate" to create AI trials for this island</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selIsland.trials.map(trial => (
                                                    <div key={trial.id} className="p-3 rounded-lg bg-abyssal/50 border border-amber-900/20 flex items-center gap-3">
                                                        <span className="text-sm">{TYPE_BADGES[trial.type] || "📝"}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white truncate">{trial.question}</p>
                                                            <p className="text-xs text-amber-600">{trial.points} pts · {trial._count.versions} versions</p>
                                                        </div>
                                                        <button onClick={() => openTrialEdit(trial)} className="text-xs px-3 py-1 rounded-lg bg-amber-900/30 text-amber-400 hover:bg-amber-800/40 transition">
                                                            Edit
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* AI Chat Section */}
                            <div className="border-t border-amber-900/30 pt-4">
                                <h3 className="text-lg mb-3" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🤖 AI Trial Assistant</h3>

                                {/* Chat history */}
                                <div className="mb-3 max-h-64 overflow-y-auto space-y-2 p-3 rounded-lg bg-abyssal/80 border border-amber-900/30">
                                    {chatMessages.length === 0 ? (
                                        <p className="text-xs text-amber-600 text-center py-4">
                                            Describe what trials you want, and I'll help you refine them before generating. For example: "Add more puzzle trials about fractions" or "Make the existing trials easier for younger students."
                                        </p>
                                    ) : (
                                        chatMessages.map((msg, i) => (
                                            <div key={i} className={`text-xs ${msg.role === "user" ? "text-amber-300" : "text-emerald-300"}`}>
                                                <span className="font-bold">{msg.role === "user" ? "You" : "🤖 AI"}:</span> {msg.content}
                                            </div>
                                        ))
                                    )}
                                    {chatLoading && <div className="text-xs text-amber-500">🤖 AI is thinking...</div>}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat input */}
                                <div className="flex gap-2">
                                    <input
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                                        placeholder={readyToGenerate ? "Type 'generate' to create trials..." : "Describe the trials you want..."}
                                        className="flex-1 px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm"
                                        disabled={generating}
                                    />
                                    {!readyToGenerate ? (
                                        <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} className="px-4 py-2 rounded-lg bg-amber-800 text-white text-sm disabled:opacity-50">
                                            Send
                                        </button>
                                    ) : (
                                        <button onClick={generateTrials} disabled={generating} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm disabled:opacity-50">
                                            {generating ? "Generating..." : "⚡ Generate Trials"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-amber-600 py-16">Voyage not found</div>
                    )}
                </main>
            </div>

            {/* ── Trial Edit Modal ── */}
            {editingTrial && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingTrial(null)}>
                    <div className="parchment rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "#5D4037" }}>
                                {TYPE_BADGES[editingTrial.type] || "📝"} Edit Trial
                            </h2>
                            <button onClick={() => setEditingTrial(null)} className="text-amber-800 hover:text-red-700 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Type</label>
                                <select value={editingTrial.type} onChange={e => setEditingTrial({ ...editingTrial, type: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }}>
                                    {Object.entries(TYPE_BADGES).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Question</label>
                                <textarea value={editingTrial.question} onChange={e => setEditingTrial({ ...editingTrial, question: e.target.value })} rows={3}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            {editingTrial.type === "multi_choice" && (
                                <div>
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Options (JSON array)</label>
                                    <input value={editingTrial.options} onChange={e => setEditingTrial({ ...editingTrial, options: e.target.value })}
                                        placeholder='["Option A", "Option B", "Option C", "Option D"]'
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Answer</label>
                                <input value={editingTrial.answer} onChange={e => setEditingTrial({ ...editingTrial, answer: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Explanation</label>
                                <textarea value={editingTrial.explanation} onChange={e => setEditingTrial({ ...editingTrial, explanation: e.target.value })} rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Hint</label>
                                <input value={editingTrial.hint} onChange={e => setEditingTrial({ ...editingTrial, hint: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Points</label>
                                    <input type="number" value={editingTrial.points} onChange={e => setEditingTrial({ ...editingTrial, points: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Sort Order</label>
                                    <input type="number" value={editingTrial.sortOrder} onChange={e => setEditingTrial({ ...editingTrial, sortOrder: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                                </div>
                            </div>
                            {trialError && <p className="text-red-600 text-sm">{trialError}</p>}
                            <div className="flex gap-3 justify-end pt-2">
                                <button onClick={() => setEditingTrial(null)} className="px-4 py-2 rounded-lg border border-amber-800/30 text-sm" style={{ color: "#5D4037" }}>Cancel</button>
                                <button onClick={saveTrial} disabled={trialSaving} className="btn-pirate text-sm">
                                    {trialSaving ? "Saving..." : "Save Trial"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Voyage Edit Modal ── */}
            {editingVoyage && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingVoyage(false)}>
                    <div className="parchment rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "#5D4037" }}>✏️ Edit Voyage</h2>
                            <button onClick={() => setEditingVoyage(false)} className="text-amber-800 hover:text-red-700 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Title</label>
                                <input value={editVoyageTitle} onChange={e => setEditVoyageTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Description</label>
                                <textarea value={editVoyageDesc} onChange={e => setEditVoyageDesc(e.target.value)} rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Objectives</label>
                                <input value={editVoyageObjectives} onChange={e => setEditVoyageObjectives(e.target.value)}
                                    placeholder="e.g., Recognize all 26 letters and their sounds"
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Status</label>
                                    <select value={editVoyageStatus} onChange={e => setEditVoyageStatus(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }}>
                                        {["Draft", "Published", "Deprecated"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Difficulty (1-5)</label>
                                    <select value={editVoyageDifficulty} onChange={e => setEditVoyageDifficulty(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }}>
                                        {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{"☠️".repeat(d)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Est. Minutes</label>
                                    <input type="number" value={editVoyageMinutes} onChange={e => setEditVoyageMinutes(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                                </div>
                                <div className="flex-1 flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editVoyageGauntlet} onChange={e => setEditVoyageGauntlet(e.target.checked)}
                                            className="w-4 h-4 rounded" />
                                        <span className="text-sm font-bold" style={{ color: "#5D4037" }}>⚔️ Captain's Gauntlet</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Tags (comma-separated)</label>
                                <input value={editVoyageTags} onChange={e => setEditVoyageTags(e.target.value)}
                                    placeholder="phonics, alphabet, reading"
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Skills (comma-separated)</label>
                                <input value={editVoyageSkills} onChange={e => setEditVoyageSkills(e.target.value)}
                                    placeholder="letter-recognition, spelling"
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }} />
                            </div>
                            {voyageError && <p className="text-red-600 text-sm">{voyageError}</p>}
                            <div className="flex gap-3 justify-end pt-2">
                                <button onClick={() => setEditingVoyage(false)} className="px-4 py-2 rounded-lg border border-amber-800/30 text-sm" style={{ color: "#5D4037" }}>Cancel</button>
                                <button onClick={saveVoyage} disabled={voyageSaving} className="btn-pirate text-sm">
                                    {voyageSaving ? "Saving..." : "Save Voyage"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
