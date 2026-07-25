"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Trial = { id: string; type: string; question: string; options?: any; answer: string; explanation: string | null; hint: string | null; points: number; difficulty: number };
type Voyage = { id: string; title: string; captainGauntlet: boolean; sea: { name: string; icon: string }; trials: Trial[] };
type Progress = { id: string; status: string; skulls: number; trialsCompleted: number } | null;

export function TrialPlayer({ voyage, progress, isCompleted, userId }: { voyage: Voyage; progress: Progress; isCompleted: boolean; userId: string }) {
    const router = useRouter();
    const [idx, setIdx] = useState(Math.min(progress?.trialsCompleted || 0, voyage.trials.length - 1));
    const [answer, setAnswer] = useState(""); const [selected, setSelected] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false); const [showHint, setShowHint] = useState(false);
    const [correct, setCorrect] = useState(false); const [skulls, setSkulls] = useState(0);
    const [loading, setLoading] = useState(false); const [done, setDone] = useState(isCompleted);
    const [startTime] = useState(Date.now()); const [hints, setHints] = useState(0);
    const [aiFeedback, setAiFeedback] = useState("");
    const t = voyage.trials[idx]; const last = idx === voyage.trials.length - 1;

    async function submit() {
        if (loading) return; setLoading(true);
        const a = (t.type === "multi_choice" ? selected : answer.trim()) || "";

        let ok: boolean; let s = 1; let fb = "";
        if (t.type === "open_ended") {
            // AI grading for open-ended trials
            try {
                const res = await fetch("/api/trials/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trialQuestion: t.question, expectedAnswer: t.answer, studentAnswer: a }) });
                const data = await res.json();
                ok = data.correct ?? true;
                s = data.skulls ?? 2;
                fb = data.feedback || "";
            } catch {
                ok = true; s = 2; fb = "";
            }
        } else {
            ok = a.toLowerCase() === t.answer.toLowerCase();
            if (ok) { if (!showHint && hints === 0) s = 3; else if (!showHint && hints <= 1) s = 2; else s = 1; }
            else s = 1;
        }

        setCorrect(ok); setSkulls(s); setAiFeedback(fb); setShowResult(true);
        await fetch("/api/trials/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trialId: t.id, userId, answer: a, correct: ok, timeSpent: Math.floor((Date.now() - startTime) / 1000), skulls: s, hintsUsed: showHint ? hints + 1 : hints }) });
        setLoading(false);
    }

    async function next() {
        if (last) {
            await fetch("/api/voyages/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voyageId: voyage.id, userId }) });
            setDone(true);
        } else { setIdx(i => i + 1); setAnswer(""); setSelected(null); setShowResult(false); setShowHint(false); setCorrect(false); setHints(0); }
    }

    if (done) return (
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="animate-cannon"><div className="text-8xl mb-6">🏆</div>
                <h2 className="text-3xl mb-2" style={{ fontFamily: "'Pirata One',cursive", color: "#F7C948" }}>{voyage.captainGauntlet ? "Gauntlet Conquered!" : "Voyage Complete!"}</h2>
                <p className="text-amber-600 mb-2">Ye conquered "{voyage.title}"!</p>
                <div className="flex justify-center gap-1 mb-8">{[1, 2, 3].map(s => <span key={s} className={`skull-star ${s <= (progress?.skulls || 3) ? "earned" : "empty"}`}>☠️</span>)}</div>
                <div className="flex gap-4 justify-center">
                    <a href="/map" className="btn-pirate">← Chart</a>
                    <button onClick={() => router.refresh()} className="btn-cannon">Sail Again 🔄</button>
                </div>
            </div>
        </main>
    );

    return (
        <main className="max-w-2xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6"><span className="text-sm text-amber-600">Trial {idx + 1} of {voyage.trials.length}</span><span className="text-sm" style={{ color: "#F7C948" }}>+{t.points} XP</span></div>
            <div className="flex gap-1 mb-8 justify-center">{voyage.trials.map((_, i) => <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < idx ? "bg-emerald-500" : i === idx ? "bg-amber-500 scale-125" : "bg-slate-700"}`} />)}</div>

            <div className="trial-scroll p-8 animate-map-unfold">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">{t.type === "multi_choice" ? "🔤 Multiple Choice" : t.type === "fill_blank" ? "✍️ Fill the Blank" : t.type === "puzzle" ? "🧩 Puzzle" : "💭 Your Answer"}</span>
                    <span className="text-xs text-amber-700">{"☠️".repeat(t.difficulty)}</span>
                </div>
                <h3 className="text-xl font-semibold mb-6 leading-relaxed">{t.question}</h3>

                {!showResult ? (<>
                    {t.type === "multi_choice" && t.options ? <div className="space-y-3">{(t.options as string[]).map((o: string) => <button key={o} onClick={() => setSelected(o)} className={`w-full text-left p-4 rounded-xl border-2 transition ${selected === o ? "border-amber-600 bg-amber-100" : "border-amber-300 bg-white hover:border-amber-400"}`}>{o}</button>)}</div>
                        : t.type === "open_ended" ? <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer..." rows={4} className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-300 focus:outline-none focus:border-amber-600 resize-none" autoFocus />
                            : <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer..." className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-300 focus:outline-none focus:border-amber-600" autoFocus />}

                    {t.hint && <div className="mt-4">{!showHint ? <button onClick={() => { setShowHint(true); setHints(h => h + 1) }} className="text-sm text-amber-600 hover:text-amber-800">💡 Reveal Hint (-1 skull)</button> : <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-sm">💡 {t.hint}</div>}</div>}

                    <button onClick={submit} disabled={loading || (t.type === "multi_choice" && !selected) || (t.type !== "multi_choice" && !answer.trim())} className="btn-pirate mt-6 w-full text-lg disabled:opacity-50">{loading ? "Thinking..." : "Fire Cannon! 💥"}</button>
                </>) : (
                    <div className="animate-cannon">
                        <div className="text-center mb-4"><div className="text-5xl mb-2">{correct ? "🎉" : "💪"}</div><h4 className={`text-xl font-bold ${correct ? "text-emerald-600" : "text-amber-600"}`}>{correct ? "Bullseye!" : "Close, sailor!"}</h4>{!correct && <p className="text-amber-700 mt-1">Answer: <span className="font-bold text-red-700">{t.answer}</span></p>}</div>
                        <div className="flex justify-center gap-1 mb-4">{[1, 2, 3].map(s => <span key={s} className={`skull-star ${s <= skulls ? "earned" : "empty"}`}>☠️</span>)}</div>
                        {t.explanation && <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4"><p className="text-sm text-amber-900">{t.explanation}</p></div>}
                        {aiFeedback && <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 mb-4"><p className="text-xs text-purple-600 mb-1">🧠 AI Feedback:</p><p className="text-sm text-purple-900">{aiFeedback}</p></div>}
                        <div className="text-center mb-6"><span className="text-sm text-purple-600 font-bold">+{t.points * skulls} XP · +{Math.floor(t.points * skulls / 2)} 🪙</span></div>
                        <button onClick={next} className="btn-pirate w-full text-lg">{last ? voyage.captainGauntlet ? "Claim the Treasure! 👑" : "Complete Voyage! 🎉" : "Next Trial →"}</button>
                    </div>
                )}
            </div>
        </main>
    );
}
