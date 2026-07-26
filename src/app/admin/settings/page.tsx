import { auth } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") redirect("/");

    const SYS_DEFAULTS = await getSystemSettings();

    return (
        <div className="min-h-screen treasure-map">
            <header className="border-b border-amber-900/30 bg-abyssal/90 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2 text-amber-600 hover:text-amber-400"><span>←</span><span className="text-sm">Admiral</span></Link>
                    <h1 className="text-xl" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>⚙️ System Settings</h1>
                    <div className="w-20" />
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🏴‍☠️ App Identity</h2>
                    <form action="/api/admin/settings" method="POST" className="space-y-3">
                        <input type="hidden" name="category" value="identity" />
                        <div><label className="block text-sm text-amber-600 mb-1">App Name</label><input name="appName" defaultValue={SYS_DEFAULTS.appName} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                        <button className="btn-pirate text-sm">Save</button>
                    </form>
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🔧 Maintenance Mode</h2>
                    <form action="/api/admin/settings" method="POST" className="space-y-3">
                        <input type="hidden" name="category" value="maintenance" />
                        <div className="flex items-center gap-3">
                            <select name="maintenanceMode" defaultValue={SYS_DEFAULTS.maintenanceMode ? "on" : "off"} className="px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white">
                                <option value="off">Off</option>
                                <option value="on">On</option>
                            </select>
                            <span className="text-sm text-amber-600">Non-admin users see maintenance page</span>
                        </div>
                        <div><label className="block text-sm text-amber-600 mb-1">Message</label><input name="maintenanceMessage" defaultValue={SYS_DEFAULTS.maintenanceMessage} className="w-full px-3 py-2 rounded-lg bg-abyssal border border-amber-900/30 text-white" /></div>
                        <button className="btn-pirate text-sm">Save</button>
                    </form>
                </div>

                <div className="sea-card p-6">
                    <h2 className="text-lg mb-4" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>🚩 Feature Flags</h2>
                    <form action="/api/admin/settings" method="POST" className="space-y-3">
                        <input type="hidden" name="category" value="features" />
                        {[{ key: "aiGeneration", label: "AI Trial Generation" }, { key: "aiTutor", label: "AI Tutor Chat" }, { key: "aiGrading", label: "AI Grading" }, { key: "shop", label: "Tavern Shop" }, { key: "registrations", label: "New Registrations" }].map(f => (
                            <div key={f.key} className="flex items-center justify-between">
                                <span className="text-sm">{f.label}</span>
                                <select name={f.key} defaultValue={SYS_DEFAULTS.featureFlags[f.key as keyof typeof SYS_DEFAULTS.featureFlags] ? "on" : "off"} className="px-3 py-1 rounded-lg bg-abyssal border border-amber-900/30 text-white text-sm">
                                    <option value="on">Enabled</option>
                                    <option value="off">Disabled</option>
                                </select>
                            </div>
                        ))}
                        <button className="btn-pirate text-sm mt-3">Save</button>
                    </form>
                </div>
            </main>
        </div>
    );
}
