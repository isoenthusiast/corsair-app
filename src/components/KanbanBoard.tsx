"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface KanbanCard {
    id: string; type: string; scope: string; status: string; title: string; description: string | null;
    priority: string; sourceTable: string | null; sourceId: string | null;
    classId: string | null; voyageId: string | null;
    assignee: { id: string; name: string } | null;
    creator: { id: string; name: string } | null;
    createdAt: string; archivedAt: string | null;
}

const SCOPE_LABELS: Record<string, string> = { Class: "🏫 Class", Trial: "⚔️ Trial", Admin: "⚓ Admin" };
const SCOPE_COLORS: Record<string, string> = { Class: "bg-blue-800 text-blue-300", Trial: "bg-purple-800 text-purple-300", Admin: "bg-slate-700 text-slate-300" };

const COLUMNS = ["Backlog", "InProgress", "Done", "Archive"] as const;
const COLUMN_LABELS: Record<string, string> = { Backlog: "📥 Backlog", InProgress: "🔄 In Progress", Done: "✅ Done", Archive: "📦 Archive" };
const TYPE_BADGES: Record<string, string> = { FlaggedTrial: "🚩", Assignment: "📋", AITrial: "🤖", SupportTicket: "🎫", Task: "📝" };
const PRIORITY_COLORS: Record<string, string> = { Low: "bg-slate-700 text-slate-300", Medium: "bg-amber-800 text-amber-300", High: "bg-red-800 text-red-300" };

export default function KanbanBoard() {
    const router = useRouter();
    const [cards, setCards] = useState<KanbanCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMore, setShowMore] = useState<Record<string, boolean>>({});
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newPrio, setNewPrio] = useState("Medium");
    const [newScope, setNewScope] = useState("Admin");
    const [error, setError] = useState("");

    // Edit modal state
    const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editPrio, setEditPrio] = useState("Medium");
    const [editStatus, setEditStatus] = useState("Backlog");
    const [editScope, setEditScope] = useState("Admin");
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState("");

    const fetchCards = useCallback(async () => {
        const res = await fetch("/api/admin/kanban");
        const data = await res.json();
        setCards(data.cards || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCards(); }, [fetchCards]);

    async function moveCard(cardId: string, newStatus: string) {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: newStatus } : c));
        await fetch(`/api/admin/kanban/${cardId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
        });
    }

    function handleDragStart(e: React.DragEvent, cardId: string) { e.dataTransfer.setData("cardId", cardId); }
    function handleDragOver(e: React.DragEvent, status: string) { e.preventDefault(); setDragOver(status); }
    function handleDragLeave() { setDragOver(null); }
    function handleDrop(e: React.DragEvent, status: string) {
        e.preventDefault(); setDragOver(null);
        const cardId = e.dataTransfer.getData("cardId");
        if (cardId) moveCard(cardId, status);
    }

    async function createTask() {
        if (!newTitle.trim()) return;
        setError("");
        const res = await fetch("/api/admin/kanban", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle, description: newDesc || null, priority: newPrio, scope: newScope, type: "Task" }),
        });
        if (res.ok) { setNewTitle(""); setNewDesc(""); setNewPrio("Medium"); setNewScope("Admin"); setShowCreate(false); fetchCards(); }
        else setError("Failed to create task");
    }

    function openEdit(card: KanbanCard) {
        setEditingCard(card);
        setEditTitle(card.title);
        setEditDesc(card.description || "");
        setEditPrio(card.priority);
        setEditStatus(card.status);
        setEditScope(card.scope || "Admin");
        setEditError("");
    }

    async function saveEdit() {
        if (!editingCard || !editTitle.trim()) return;
        setEditSaving(true);
        setEditError("");
        const res = await fetch(`/api/admin/kanban/${editingCard.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: editTitle, description: editDesc || null, priority: editPrio, status: editStatus, scope: editScope }),
        });
        if (res.ok) {
            setEditingCard(null);
            fetchCards();
        } else {
            setEditError("Failed to save changes");
        }
        setEditSaving(false);
    }

    if (loading) return <div className="text-amber-600 text-center py-16">Loading board...</div>;

    return (
        <div>
            {/* Create Task button */}
            <div className="flex justify-end mb-4">
                <button onClick={() => setShowCreate(!showCreate)} className="btn-pirate text-sm">+ New Task</button>
            </div>

            {/* Create modal */}
            {showCreate && (
                <div className="mb-6 p-4 rounded-xl bg-abyssal/80 border border-amber-700/30">
                    <div className="flex gap-3 mb-3">
                        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..." className="flex-1 px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" onKeyDown={e => e.key === "Enter" && createTask()} />
                        <select value={newScope} onChange={e => setNewScope(e.target.value)} className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                            {["Admin", "Class", "Trial"].map(s => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
                        </select>
                        <select value={newPrio} onChange={e => setNewPrio(e.target.value)} className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                            {["Low", "Medium", "High"].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button onClick={createTask} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm">Create</button>
                    </div>
                    <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm" />
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>
            )}

            {/* Board columns */}
            <div className="grid grid-cols-4 gap-4">
                {COLUMNS.map(col => {
                    const colCards = cards.filter(c => c.status === col);
                    const visible = showMore[col] ? colCards : colCards.slice(0, 5);
                    const hidden = colCards.length - 5;

                    return (
                        <div
                            key={col}
                            onDragOver={e => handleDragOver(e, col)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, col)}
                            className={`rounded-xl p-3 min-h-[200px] transition-colors ${dragOver === col ? "bg-amber-900/30 border-amber-500/50" : "bg-abyssal/50 border-amber-900/20"} border`}
                        >
                            <h3 className="text-sm font-bold mb-3 flex items-center justify-between" style={{ color: "#F7C948" }}>
                                {COLUMN_LABELS[col]}
                                <span className="text-xs text-amber-600">{colCards.length}</span>
                            </h3>

                            <div className="space-y-2">
                                {visible.map(card => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={e => handleDragStart(e, card.id)}
                                        onClick={() => openEdit(card)}
                                        className="p-3 rounded-lg bg-abyssal border border-amber-900/30 cursor-grab active:cursor-grabbing hover:border-amber-600/50 transition"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs">{TYPE_BADGES[card.type] || "📝"}</span>
                                            <span className="text-xs font-medium text-white truncate flex-1">{card.title}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${PRIORITY_COLORS[card.priority] || ""}`}>{card.priority}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${SCOPE_COLORS[card.scope] || SCOPE_COLORS["Admin"]}`}>{SCOPE_LABELS[card.scope] || "⚓ Admin"}</span>
                                            {card.assignee && <span className="text-xs text-amber-600">👤 {card.assignee.name}</span>}
                                        </div>
                                        <p className="text-xs text-amber-800 mt-1">{new Date(card.createdAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                                {colCards.length === 0 && <p className="text-xs text-amber-800 text-center py-4">No cards yet</p>}
                            </div>

                            {hidden > 0 && !showMore[col] && (
                                <button onClick={() => setShowMore(s => ({ ...s, [col]: true }))} className="mt-2 text-xs text-amber-400 hover:text-amber-200 w-full text-center">
                                    Show More ({hidden} more)
                                </button>
                            )}
                            {showMore[col] && hidden > 0 && (
                                <button onClick={() => setShowMore(s => ({ ...s, [col]: false }))} className="mt-2 text-xs text-amber-400 hover:text-amber-200 w-full text-center">
                                    Show Less
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Edit modal */}
            {editingCard && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingCard(null)}>
                    <div className="parchment rounded-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "#5D4037" }}>
                                {TYPE_BADGES[editingCard.type] || "📝"} Edit Card
                            </h2>
                            <button onClick={() => setEditingCard(null)} className="text-amber-800 hover:text-red-700 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Title</label>
                                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm"
                                    style={{ color: "#3E2723" }} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Description</label>
                                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm"
                                    style={{ color: "#3E2723" }} />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Status</label>
                                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }}>
                                        {COLUMNS.map(c => <option key={c} value={c}>{COLUMN_LABELS[c]}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Scope</label>
                                    <select value={editScope} onChange={e => setEditScope(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }}>
                                        {["Admin", "Class", "Trial"].map(s => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1" style={{ color: "#5D4037" }}>Priority</label>
                                    <select value={editPrio} onChange={e => setEditPrio(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white border-2 border-amber-800/30 text-sm" style={{ color: "#3E2723" }}>
                                        {["Low", "Medium", "High"].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            {editError && <p className="text-red-600 text-sm">{editError}</p>}
                            <div className="flex gap-3 justify-end pt-2">
                                <button onClick={() => setEditingCard(null)} className="px-4 py-2 rounded-lg border border-amber-800/30 text-sm" style={{ color: "#5D4037" }}>Cancel</button>
                                <button onClick={saveEdit} disabled={editSaving}
                                    className="btn-pirate text-sm">
                                    {editSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
