import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("bible_usuarios")
    .select("id, email, nombre, version_biblica, created_at")
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

  const { nombre, version_biblica } = await request.json();

  const VERSIONES_VALIDAS = ["RV1909", "RVR1960", "NVI", "TLA"];
  const updates: Record<string, string> = {};

  if (nombre !== undefined) {
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    updates.nombre = nombre.trim();
  }

  if (version_biblica !== undefined) {
    if (!VERSIONES_VALIDAS.includes(version_biblica)) {
      return NextResponse.json({ error: "Versión bíblica no válida" }, { status: 400 });
    }
    updates.version_biblica = version_biblica;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bible_usuarios")
    .update(updates)
    .eq("id", user.id)
    .select("id, email, nombre, version_biblica")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ usuario: data });
}

export async function DELETE() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Eliminar fila en bible_usuarios (CASCADE elimina planes, sesiones, análisis, tareas)
  const { error: dbError } = await supabase
    .from("bible_usuarios")
    .delete()
    .eq("id", user.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Eliminar usuario de Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Cerrar sesión
  await authClient.auth.signOut();

  return NextResponse.json({ ok: true });
}
