import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Corsair Academy — Pirate Learning Adventure",
    description: "Set sail on a learning adventure! Master the 4 Seas and become a Sea Lord!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen antialiased">{children}</body>
        </html>
    );
}
