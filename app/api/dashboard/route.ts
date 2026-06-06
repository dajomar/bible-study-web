import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const hoy = new Date().toISOString().split("T")[0];

  // Todos los planes activos
  const { data: planesActivosRaw } = await supabase
    .from("bible_planes")
    .select("id, nombre")
    .eq("id_usuario", user.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  // Planes inactivos
  const { data: otrosPlanesRaw } = await supabase
    .from("bible_planes")
    .select("id, nombre")
    .eq("id_usuario", user.id)
    .eq("activo", false)
    .order("created_at", { ascending: false });

  // Tareas pendientes (3 más recientes)
  const { data: tareas } = await supabase
    .from("bible_tareas")
    .select("id, descripcion, origen, created_at")
    .eq("id_usuario", user.id)
    .eq("completada", false)
    .order("created_at", { ascending: false })
    .limit(3);

  // Progreso de planes inactivos
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

  if (!planesActivosRaw?.length) {
    return NextResponse.json({
      planesActivos: [],
      tareasHoy: tareas ?? [],
      otrosPlanes,
    });
  }

  // Sesión del día + progreso para cada plan activo (en paralelo)
  const planesActivos = await Promise.all(
    planesActivosRaw.map(async (p) => {
      const [sesionResult, totalResult, completadasResult] = await Promise.all([
        supabase
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
          .eq("id_plan", p.id)
          .eq("fecha_programada", hoy)
          .maybeSingle(),
        supabase.from("bible_sesiones").select("id", { count: "exact", head: true }).eq("id_plan", p.id),
        supabase.from("bible_sesiones").select("id", { count: "exact", head: true }).eq("id_plan", p.id).eq("completada", true),
      ]);

      const total = totalResult.count ?? 0;
      const completadas = completadasResult.count ?? 0;

      return {
        id: p.id,
        nombre: p.nombre,
        sesionHoy: sesionResult.data ?? null,
        progreso: {
          total,
          completadas,
          porcentaje: total ? Math.round((completadas / total) * 100) : 0,
        },
      };
    })
  );

  return NextResponse.json({
    planesActivos,
    tareasHoy: tareas ?? [],
    otrosPlanes,
  });
}
