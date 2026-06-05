import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: usuario } = await supabase
    .from("bible_usuarios")
    .select("version_biblica")
    .eq("id", user.id)
    .single();

  const version = usuario?.version_biblica ?? "RVR1960";

  const { data, error } = await supabase
    .from("bible_libros")
    .select("id, orden, nombre, abreviatura, testamento")
    .eq("version", version)
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ libros: data, version });
}
