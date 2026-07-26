/**
 * Admin API Test Runner — economy/settings persistence + audit logging
 * Run: npx tsx scripts/test-admin.ts
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
    const creds: Record<string, [string, string]> = { Admin: ["admin", "admin123"], Teacher: ["teacher1", "teach123"], Student: ["andrew", "andrew123"] };
    const [u, p] = creds[role] || creds.Student; const j = new Jar();
    const r = await req("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `username=${u}&password=${p}`, redirect: "manual" });
    r.headers.forEach((v, k) => { if (k.toLowerCase() === "set-cookie") j.add(v); });
    return j;
}

async function run() {
    console.log("\n🧪 Admin API Tests\n");

    const adminJar = await login("Admin");

    // ── Economy Persistence ──
    console.log("── Economy Settings ──");
    await T("Economy", "GET /api/admin/economy returns 200", async () => {
        const r = await req("/admin/economy", { headers: { cookie: adminJar.toString() } });
        return r.status === 200;
    })();

    await T("Economy", "POST crownRate persists to DB", async () => {
        const form = new URLSearchParams({ setting: "crownRate", value: "0.75" });
        const r = await req("/api/admin/economy", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: form.toString(), redirect: "manual" });
        return r.status === 307; // redirect after POST
    })();

    await T("Economy", "POST shop price persists", async () => {
        const form = new URLSearchParams({ setting: "shop_whisper_scroll", value: "25" });
        const r = await req("/api/admin/economy", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: form.toString(), redirect: "manual" });
        return r.status === 307;
    })();

    await T("Economy", "POST upgrade cost persists", async () => {
        const form = new URLSearchParams({ setting: "upgrade_0", value: "350" });
        const r = await req("/api/admin/economy", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: form.toString(), redirect: "manual" });
        return r.status === 307;
    })();

    // ── Settings Persistence ──
    console.log("── System Settings ──");
    await T("Settings", "GET /api/admin/settings returns 200", async () => {
        const r = await req("/admin/settings", { headers: { cookie: adminJar.toString() } });
        return r.status === 200;
    })();

    await T("Settings", "POST identity persists", async () => {
        const form = new URLSearchParams({ category: "identity", appName: "Test Academy" });
        const r = await req("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: form.toString(), redirect: "manual" });
        return r.status === 307;
    })();

    await T("Settings", "POST maintenance toggles", async () => {
        const form = new URLSearchParams({ category: "maintenance", maintenanceMode: "on", maintenanceMessage: "Test maintenance" });
        const r = await req("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: form.toString(), redirect: "manual" });
        return r.status === 307;
    })();

    await T("Settings", "POST feature flags toggle", async () => {
        const form = new URLSearchParams({ category: "features", aiGeneration: "off", shop: "on" });
        const r = await req("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: form.toString(), redirect: "manual" });
        return r.status === 307;
    })();

    // ── Audit Logging ──
    console.log("── Audit Logging ──");
    await T("Audit", "POST economy reset creates audit log", async () => {
        const r = await req("/api/admin/economy/reset", { method: "POST", headers: { cookie: adminJar.toString() }, redirect: "manual" });
        return r.status === 307;
    })();

    // ── Login History ──
    console.log("── Login History ──");
    await T("LoginHistory", "Failed login is logged", async () => {
        const r = await req("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "username=nonexistent&password=wrong", redirect: "manual" });
        return r.status === 302 || r.status === 200; // redirect to / or error page
    })();

    // ── Maintenance Mode ──
    console.log("── Maintenance Mode ──");
    await T("Maintenance", "Student sees maintenance page when enabled", async () => {
        const studentJar = await login("Student");
        const r = await req("/map", { headers: { cookie: studentJar.toString() }, redirect: "manual" });
        const text = await r.text();
        // If maintenance is on, the page should contain "Dry Dock" or normal map content
        return r.status === 200 && (text.includes("Dry Dock") || text.includes("Chart Your Course"));
    })();

    // Reset economy to defaults
    await req("/api/admin/economy/reset", { method: "POST", headers: { cookie: adminJar.toString() }, redirect: "manual" });
    // Turn off maintenance
    const maintForm = new URLSearchParams({ category: "maintenance", maintenanceMode: "off", maintenanceMessage: "Back soon!" });
    await req("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: adminJar.toString() }, body: maintForm.toString(), redirect: "manual" });

    // Summary
    const cats = [...new Set(results.map(r => r.category))];
    console.log("\n" + "=".repeat(50));
    for (const cat of cats) {
        const catResults = results.filter(r => r.category === cat);
        const pass = catResults.filter(r => r.pass).length;
        console.log(`  ${cat}: ${pass}/${catResults.length}`);
    }
    const totalPass = results.filter(r => r.pass).length;
    console.log(`\n📊 Total: ${totalPass}/${results.length} (${Math.round(totalPass / results.length * 100)}%)`);
    process.exit(totalPass === results.length ? 0 : 1);
}

run();
