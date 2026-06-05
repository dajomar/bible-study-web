import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const hoy = new Date().toISOString().split("T")[0];

  // Plan activo (el más reciente en caso de duplicados)
  const { data: planesActivos } = await supabase
    .from("bible_planes")
    .select("id, nombre")
    .eq("id_usuario", user.id)
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const plan = planesActivos?.[0] ?? null;

  // Otros planes (inactivos/archivados)
  const { data: otrosPlanesRaw } = await supabase
    .from("bible_planes")
    .select("id, nombre")
    .eq("id_usuario", user.id)
    .eq("activo", false)
    .order("created_at", { ascending: false });

  // Progreso de cada plan inactivo (en paralelo)
  const otrosPlanes = await Promise.all(
    (otrosPlanesRaw ?? []).map(async (p) => {
      const [{ count: total }, { count: completadas }] = await Promise.all([
        supabase.from("bible_sesiones").select("id", { count: "exact", head: true }).eq("id_plan", p.id),
        supabase.from("bible_sesiones").select("id", { count: "exact", head: true }).eq("id_plan", p.id).eq("completada", true),
      ]);
      return {
        id: p.id,
        nombre: p.nombre,
        progreso: {
          total: total ?? 0,
          completadas: completadas ?? 0,
          porcentaje: total ? Math.round(((completadas ?? 0) / total) * 100) : 0,
        },
      };
    })
  );

  if (!plan) {
    return NextResponse.json({
      plan: null,
      sesionHoy: null,
      progreso: null,
      tareasHoy: [],
      otrosPlanes,
    });
  }

  // Sesión programada para hoy
  const { data: sesionHoy } = await supabase
    .from("bible_sesiones")
    .select(`
      id, orden, completada, fecha_programada,
      inicio:versiculo_inicio_id (
        numero,
        capitulo:id_capitulo ( numero, libro:id_libro ( nombre, abreviatura ) )
      ),
      fin:versiculo_fin_id (
        numero,
        capitulo:id_capitulo ( numero, libro:id_libro ( nombre, abreviatura ) )
      )
    `)
    .eq("id_plan", plan.id)
    .eq("fecha_programada", hoy)
    .maybeSingle();

  // Progreso del plan activo
  const [{ count: total }, { count: completadas }] = await Promise.all([
    supabase.from("bible_sesiones").select("id", { count: "exact", head: true }).eq("id_plan", plan.id),
    supabase.from("bible_sesiones").select("id", { count: "exact", head: true }).eq("id_plan", plan.id).eq("completada", true),
  ]);

  // Tareas pendientes (3 más recientes)
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
    otrosPlanes,
  });
}
