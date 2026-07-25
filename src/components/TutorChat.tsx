"use client";

import { useState, useRef, useEffect } from "react";

interface TutorContext {
    voyageTitle: string;
    seaName: string;
    subject: string;
    trialIndex: number;
    totalTrials: number;
    trialType: string;
}

export default function TutorChat({ context }: { context: TutorContext }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "tutor"; text: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    async function send() {
        const msg = input.trim();
        if (!msg || loading) return;
        setMessages(m => [...m, { role: "user", text: msg }]);
        setInput(""); setLoading(true);
        try {
            const res = await fetch("/api/tutor/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, context }) });
            const data = await res.json();
            setMessages(m => [...m, { role: "tutor", text: data.reply || "Arr, try again!" }]);
        } catch {
            setMessages(m => [...m, { role: "tutor", text: "The seas be choppy! Try again, sailor. 🦜" }]);
        } finally { setLoading(false); }
    }

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-700 border-2 border-amber-500 text-2xl shadow-lg hover:bg-amber-600 transition flex items-center justify-center"
                title="Ask Captain Corsair"
            >
                🦜
            </button>

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 w-80 max-h-96 rounded-xl bg-abyssal border border-amber-700/50 shadow-2xl flex flex-col overflow-hidden">
                    <div className="px-4 py-2 border-b border-amber-900/30 flex items-center justify-between bg-amber-900/20">
                        <span className="text-sm font-bold" style={{ color: "#F7C948" }}>🦜 Captain Corsair</span>
                        <button onClick={() => setOpen(false)} className="text-amber-600 hover:text-amber-400 text-lg">×</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm max-h-64">
                        {messages.length === 0 && (
                            <p className="text-amber-600 text-xs text-center py-4">Ask me anything about yer current quest, sailor! 🗺️</p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`p-2 rounded-lg ${m.role === "user" ? "bg-amber-900/20 ml-4 text-right" : "bg-purple-900/20 mr-4"}`}>
                                <span className="text-xs text-amber-600 block mb-0.5">{m.role === "user" ? "You" : "🦜 Captain"}</span>
                                <span className="text-white">{m.text}</span>
                            </div>
                        ))}
                        {loading && <div className="text-amber-600 text-xs text-center">Captain is thinking...</div>}
                        <div ref={bottomRef} />
                    </div>
                    <div className="p-2 border-t border-amber-900/30 flex gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask yer question..." className="flex-1 px-3 py-1.5 rounded-lg bg-abyssal border border-amber-900/30 text-white text-xs" />
                        <button onClick={send} disabled={loading} className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs hover:bg-amber-600 disabled:opacity-50">Send</button>
                    </div>
                </div>
            )}
        </>
    );
}
