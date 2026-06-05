import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const planId = Number(params.id);

  const { data: plan } = await supabase
    .from("bible_planes")
    .select("id")
    .eq("id", planId)
    .eq("id_usuario", user.id)
    .single();

  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  const { error } = await supabase
    .from("bible_planes")
    .delete()
    .eq("id", planId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const planId = Number(params.id);
  const { activo } = await request.json();

  // Verificar que el plan pertenece al usuario
  const { data: plan } = await supabase
    .from("bible_planes")
    .select("id")
    .eq("id", planId)
    .eq("id_usuario", user.id)
    .single();

  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  const { error } = await supabase
    .from("bible_planes")
    .update({ activo })
    .eq("id", planId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
