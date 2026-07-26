import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isMaintenanceMode } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
    title: "Corsair Academy — Pirate Learning Adventure",
    description: "Set sail on a learning adventure! Master the 4 Seas and become a Sea Lord!",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    const isAdmin = session?.user?.role === "Admin";
    const { enabled, message } = await isMaintenanceMode();

    if (enabled && !isAdmin) {
        return (
            <html lang="en">
                <body className="min-h-screen antialiased">
                    <div className="min-h-screen treasure-map flex items-center justify-center">
                        <div className="sea-card p-12 max-w-lg mx-4 text-center">
                            <span className="text-6xl">🏴‍☠️</span>
                            <h1 className="text-2xl mt-4 mb-2" style={{ fontFamily: "'Pirata One', cursive", color: "#F7C948" }}>Dry Dock</h1>
                            <p className="text-amber-600">{message}</p>
                        </div>
                    </div>
                </body>
            </html>
        );
    }

    return (
        <html lang="en">
            <body className="min-h-screen antialiased">{children}</body>
        </html>
    );
}
