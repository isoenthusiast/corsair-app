import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const setting = form.get("setting") as string;
    const value = form.get("value") as string;
    // In production, store in DB EconomySettings table. For now, redirect with success.
    console.log(`Economy setting: ${setting} = ${value}`);
    redirect("/admin/economy");
}
