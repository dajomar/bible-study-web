import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Análisis de todas las sesiones de los planes del usuario
  // bible_analisis → bible_sesiones → bible_planes (id_usuario = user.id)
  const { data, error } = await supabase
    .from("bible_analisis")
    .select(`
      id, resumen, temas_principales, contexto_historico,
      conexiones, preguntas_reflexion, modelo_usado, created_at,
      sesion:id_sesion (
        id, orden,
        plan:id_plan ( id, nombre, id_usuario, activo ),
        inicio:versiculo_inicio_id (
          numero,
          capitulo:id_capitulo (
            numero,
            libro:id_libro ( nombre )
          )
        ),
        fin:versiculo_fin_id (
          numero,
          capitulo:id_capitulo (
            numero,
            libro:id_libro ( nombre )
          )
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filtrar solo los que pertenecen al usuario
  const propios = (data ?? []).filter((a) => {
    const plan = (a.sesion as unknown as { plan: { id_usuario: string; activo: boolean } }).plan;
    return plan?.id_usuario === user.id && plan?.activo === true;
  });

  return NextResponse.json({ analisis: propios });
}
