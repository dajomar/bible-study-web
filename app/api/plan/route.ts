import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Todos los planes del usuario con conteo de sesiones
  const { data: planes, error } = await supabase
    .from("bible_planes")
    .select(`
      id, nombre, descripcion, activo, created_at,
      sesiones:bible_sesiones ( id, completada )
    `)
    .eq("id_usuario", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Para el plan activo, traemos las sesiones completas con referencia bíblica
  const planActivo = (planes ?? []).find((p) => p.activo);
  let sesiones: unknown[] = [];

  if (planActivo) {
    const { data } = await supabase
      .from("bible_sesiones")
      .select(`
        id, orden, completada, fecha_programada, fecha_completada,
        inicio:versiculo_inicio_id (
          numero,
          capitulo:id_capitulo ( numero, libro:id_libro ( nombre ) )
        ),
        fin:versiculo_fin_id (
          numero,
          capitulo:id_capitulo ( numero, libro:id_libro ( nombre ) )
        )
      `)
      .eq("id_plan", planActivo.id)
      .order("orden", { ascending: true });

    sesiones = data ?? [];
  }

  // Añadir métricas de progreso a cada plan
  const planesConProgreso = (planes ?? []).map((p) => {
    const total = (p.sesiones as { id: number; completada: boolean }[]).length;
    const completadas = (p.sesiones as { id: number; completada: boolean }[]).filter(
      (s) => s.completada
    ).length;
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      activo: p.activo,
      created_at: p.created_at,
      progreso: { total, completadas, porcentaje: total ? Math.round((completadas / total) * 100) : 0 },
    };
  });

  return NextResponse.json({ planes: planesConProgreso, sesiones });
}

export async function POST(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { nombre, descripcion } = await request.json();
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  // Desactivar planes existentes antes de crear el nuevo
  await supabase
    .from("bible_planes")
    .update({ activo: false })
    .eq("id_usuario", user.id);

  const { data, error } = await supabase
    .from("bible_planes")
    .insert({ id_usuario: user.id, nombre: nombre.trim(), descripcion: descripcion?.trim() || null, activo: true })
    .select("id, nombre, descripcion, activo, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plan: data }, { status: 201 });
}
