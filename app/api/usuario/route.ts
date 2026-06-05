import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("bible_usuarios")
    .select("id, email, nombre, created_at")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Stats: obtener IDs de planes primero, luego contar
  const { data: planes, count: totalPlanes } = await supabase
    .from("bible_planes")
    .select("id", { count: "exact" })
    .eq("id_usuario", user.id);

  const planIds = (planes ?? []).map((p) => p.id);

  let sesionesCompletadas = 0;
  let totalAnalisis = 0;

  if (planIds.length > 0) {
    const { data: sesiones, count: countSesiones } = await supabase
      .from("bible_sesiones")
      .select("id", { count: "exact" })
      .in("id_plan", planIds)
      .eq("completada", true);

    sesionesCompletadas = countSesiones ?? 0;

    const sesionIds = (sesiones ?? []).map((s) => s.id);
    if (sesionIds.length > 0) {
      const { count: countAnalisis } = await supabase
        .from("bible_analisis")
        .select("id", { count: "exact", head: true })
        .in("id_sesion", sesionIds);
      totalAnalisis = countAnalisis ?? 0;
    }
  }

  return NextResponse.json({
    usuario: data,
    stats: {
      totalPlanes: totalPlanes ?? 0,
      sesionesCompletadas,
      totalAnalisis,
    },
  });
}

export async function PUT(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { nombre } = await request.json();
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bible_usuarios")
    .update({ nombre: nombre.trim() })
    .eq("id", user.id)
    .select("id, email, nombre")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ usuario: data });
}
