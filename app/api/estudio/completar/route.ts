import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { sesionId } = await request.json();

  if (!sesionId) {
    return NextResponse.json({ error: "sesionId requerido" }, { status: 400 });
  }

  // Verificar que la sesión pertenece a un plan del usuario
  const { data: sesion } = await supabase
    .from("bible_sesiones")
    .select("id, id_plan, bible_planes!inner(id_usuario)")
    .eq("id", sesionId)
    .single();

  const planData = sesion?.bible_planes as unknown as { id_usuario: string } | null;
  if (!sesion || planData?.id_usuario !== user.id) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const { error } = await supabase
    .from("bible_sesiones")
    .update({
      completada: true,
      fecha_completada: new Date().toISOString(),
    })
    .eq("id", sesionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
