import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
    const form = await request.formData();
    const setting = form.get("setting") as string;
    const value = form.get("value") as string;
    // In production, store in DB EconomySettings table. For now, redirect with success.
    console.log(`Economy setting: ${setting} = ${value}`);
    redirect("/admin/economy");
}
