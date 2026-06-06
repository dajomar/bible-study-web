import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const notaId = Number(params.id);
  const { texto, color } = await request.json();

  // Verificar propiedad
  const { data: nota } = await supabase
    .from("bible_notas")
    .select("id")
    .eq("id", notaId)
    .eq("id_usuario", user.id)
    .single();

  if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (texto !== undefined) updates.texto = texto.trim();
  if (color !== undefined) updates.color = color;

  const { error } = await supabase
    .from("bible_notas")
    .update(updates)
    .eq("id", notaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const notaId = Number(params.id);

  // Verificar propiedad
  const { data: nota } = await supabase
    .from("bible_notas")
    .select("id")
    .eq("id", notaId)
    .eq("id_usuario", user.id)
    .single();

  if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  const { error } = await supabase
    .from("bible_notas")
    .delete()
    .eq("id", notaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
