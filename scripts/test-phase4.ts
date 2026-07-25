/**
 * Phase 4 Test Runner — API & E2E Validation
 * Run: npx tsx scripts/test-phase4.ts
 */
const BASE = process.env.AUTH_URL || "http://localhost:3200";

interface TR { name: string; pass: boolean; category: string }
const results: TR[] = [];
const T = (cat: string, name: string, fn: () => Promise<boolean>) => async () => {
    try { const p = await fn(); results.push({ category: cat, name, pass: p }); console.log(`  ${p ? "✅" : "❌"} ${name}`); }
    catch (e: any) { results.push({ category: cat, name, pass: false }); console.log(`  ❌ ${name} — ${e.message?.slice(0, 80)}`); }
};

class Jar { private m = new Map<string, string>(); add(h: string) { const x = h.match(/^([^=]+)=([^;]+)/); if (x) this.m.set(x[1], x[2]); } toString() { return [...this.m].map(([k, v]) => `${k}=${v}`).join("; "); } }

async function req(path: string, o?: RequestInit) { return fetch(`${BASE}${path}`, { redirect: "manual", ...o }); }

async function login(role: string) {
    const creds: Record<string, [string, string]> = { Admin: ["admin", "admin123"], Teacher: ["teacher1", "teach123"], Parent: ["parent", "learning123"], Student: ["andrew", "andrew123"] };
    const [u, p] = creds[role] || creds.Student; const j = new Jar();
    const c = await req("/api/auth/csrf"); c.headers.getSetCookie().forEach(h => j.add(h)); const { csrfToken } = await c.json() as any;
    const fd = new URLSearchParams({ username: u, password: p, redirect: "false" }); if (csrfToken) fd.append("csrfToken", csrfToken);
    const l = await req("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: j.toString() }, body: fd.toString() });
    l.headers.getSetCookie().forEach(h => j.add(h)); await req("/api/auth/session", { headers: { cookie: j.toString() } });
    return j;
}

async function run() {
    console.log("\n🏴‍☠️ Corsair Academy — Phase 4 Validation\n");
    const admin = await login("Admin"); const student = await login("Student");

    console.log("── E2: Auth ──");
    await T("E2", "Admin session", async () => (await req("/admin", { headers: { cookie: admin.toString() } })).status < 400)();
    await T("E2", "Student session", async () => (await req("/map", { headers: { cookie: student.toString() } })).status < 400)();
    await T("E2", "Student blocked /admin", async () => (await req("/admin", { headers: { cookie: student.toString() } })).status === 307)();
    await T("E2", "Unauthed /map → /", async () => (await req("/map")).status === 307)();

    console.log("\n── E1: Admin Pages ──");
    const adminPages = ["/admin", "/admin/users", "/admin/users/new", "/admin/classes", "/admin/classes/new", "/admin/voyages", "/admin/announcements", "/admin/invites", "/admin/economy", "/admin/parents", "/admin/analytics", "/admin/moderation", "/admin/settings", "/admin/templates"];
    for (const p of adminPages) await T("E1", p, async () => (await req(p, { headers: { cookie: admin.toString() } })).status < 400)();

    console.log("\n── E4: Student Pages ──");
    for (const p of ["/map", "/profile", "/tavern", "/ship"]) await T("E4", p, async () => (await req(p, { headers: { cookie: student.toString() } })).status < 400)();

    console.log("\n── AI Modules ──");
    await T("AI-1", "Generate trials", async () => { const r = await req("/api/admin/voyages/sea-of-cunning-message-in-a-bottle/generate-trials", { method: "POST", headers: { "Content-Type": "application/json", cookie: admin.toString() }, body: JSON.stringify({ count: 1 }) }); return r.status < 500; })();
    await T("AI-2", "Grade answer", async () => { const r = await req("/api/trials/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trialQuestion: "2+2?", expectedAnswer: "4", studentAnswer: "4" }) }); const d = await r.json() as any; return r.ok && d.skulls >= 1; })();
    await T("AI-2", "Empty answer", async () => { const r = await req("/api/trials/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trialQuestion: "Q?", expectedAnswer: "A", studentAnswer: "" }) }); const d = await r.json() as any; return r.ok && d.correct === false && d.skulls === 1; })();
    await T("AI-3", "Tutor chat", async () => { const r = await req("/api/tutor/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Hi!", context: { voyageTitle: "T", seaName: "S", subject: "E", trialIndex: 0, totalTrials: 1, trialType: "m" } }) }); const d = await r.json() as any; return r.ok && typeof d.reply === "string" && d.reply.length > 0; })();
    await T("AI-4", "Adaptive", async () => { const r = await req("/api/adaptive/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "andrew", voyageId: "sea-of-cunning-message-in-a-bottle" }) }); const d = await r.json() as any; return r.ok && typeof d.adjusted === "boolean"; })();
    await T("AI-5", "Personalize", async () => { const r = await req("/api/personalize/recommend", { headers: { cookie: student.toString() } }); const d = await r.json() as any; return r.ok && Array.isArray(d.seaProgress) && d.seaProgress.length === 4; })();

    console.log("\n" + "=".repeat(50));
    const cats: Record<string, { p: number; t: number }> = {};
    for (const r of results) { if (!cats[r.category]) cats[r.category] = { p: 0, t: 0 }; cats[r.category].t++; if (r.pass) cats[r.category].p++; }
    for (const [c, s] of Object.entries(cats)) console.log(`  ${s.p === s.t ? "✅" : "⚠️"} ${c}: ${s.p}/${s.t}`);
    const pass = results.filter(r => r.pass).length;
    console.log(`\n📊 Total: ${pass}/${results.length} (${Math.round(pass / results.length * 100)}%)\n`);
    process.exit(0);
}
run();
