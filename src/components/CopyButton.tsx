"use client";

import { useState } from "react";

export default function CopyButton({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <button onClick={copy} className="px-2 py-1 rounded bg-amber-900/30 text-amber-400 text-xs hover:bg-amber-900/50">
            {copied ? "✓ Copied!" : "📋 Copy"}
        </button>
    );
}
