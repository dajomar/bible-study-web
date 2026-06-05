import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

const COLORES_VALIDOS = ["amarillo", "verde", "azul", "rosa", "naranja"];

export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const param = request.nextUrl.searchParams.get("versiculos") ?? "";
  const ids = param.split(",").map(Number).filter(Boolean);
  if (!ids.length) return NextResponse.json({ resaltados: [] });

  const { data, error } = await supabase
    .from("bible_resaltados")
    .select("id_versiculo, color")
    .eq("id_usuario", user.id)
    .in("id_versiculo", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resaltados: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const { id_versiculo, color } = body;

  if (!id_versiculo || !COLORES_VALIDOS.includes(color)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { error } = await supabase
    .from("bible_resaltados")
    .upsert(
      { id_usuario: user.id, id_versiculo, color },
      { onConflict: "id_usuario,id_versiculo" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
