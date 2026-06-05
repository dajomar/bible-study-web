import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // 1. Usuario autenticado
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const hoy = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  // 2. Plan activo del usuario
  const { data: plan } = await supabase
    .from("bible_planes")
    .select("id, nombre, descripcion")
    .eq("id_usuario", user.id)
    .eq("activo", true)
    .single();

  if (!plan) {
    return NextResponse.json({
      plan: null,
      sesionHoy: null,
      progreso: null,
      tareasHoy: [],
    });
  }

  // 3. Sesión programada para hoy
  const { data: sesionHoy } = await supabase
    .from("bible_sesiones")
    .select(`
      id, orden, completada, fecha_programada,
      inicio:versiculo_inicio_id (
        numero,
        capitulo:id_capitulo (
          numero,
          libro:id_libro ( nombre, abreviatura )
        )
      ),
      fin:versiculo_fin_id (
        numero,
        capitulo:id_capitulo (
          numero,
          libro:id_libro ( nombre, abreviatura )
        )
      )
    `)
    .eq("id_plan", plan.id)
    .eq("fecha_programada", hoy)
    .single();

  // 4. Progreso del plan (total y completadas)
  const { count: total } = await supabase
    .from("bible_sesiones")
    .select("id", { count: "exact", head: true })
    .eq("id_plan", plan.id);

  const { count: completadas } = await supabase
    .from("bible_sesiones")
    .select("id", { count: "exact", head: true })
    .eq("id_plan", plan.id)
    .eq("completada", true);

  // 5. Tareas pendientes del usuario (las 3 más recientes)
  const { data: tareas } = await supabase
    .from("bible_tareas")
    .select("id, descripcion, origen, created_at")
    .eq("id_usuario", user.id)
    .eq("completada", false)
    .order("created_at", { ascending: false })
    .limit(3);

  return NextResponse.json({
    plan: { id: plan.id, nombre: plan.nombre },
    sesionHoy: sesionHoy ?? null,
    progreso: {
      total: total ?? 0,
      completadas: completadas ?? 0,
      porcentaje: total ? Math.round(((completadas ?? 0) / total) * 100) : 0,
    },
    tareasHoy: tareas ?? [],
  });
}
