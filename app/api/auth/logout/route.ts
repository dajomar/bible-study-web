import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";

export async function POST() {
  const supabase = createAuthClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
