import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Plan activo del usuario (el más reciente en caso de duplicados)
  const { data: planesActivos } = await supabase
    .from("bible_planes")
    .select("id, nombre")
    .eq("id_usuario", user.id)
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const plan = planesActivos?.[0] ?? null;

  if (!plan) {
    return NextResponse.json({ sesion: null, versiculos: [], secciones: [], analisis: null, sinPlan: true });
  }

  // Sesión activa: la primera no completada del plan
  const { data: sesion } = await supabase
    .from("bible_sesiones")
    .select(`
      id, orden, completada, fecha_programada,
      inicio:versiculo_inicio_id ( id, numero, id_capitulo ),
      fin:versiculo_fin_id ( id, numero, id_capitulo )
    `)
    .eq("id_plan", plan.id)
    .eq("completada", false)
    .order("orden", { ascending: true })
    .limit(1)
    .single();

  if (!sesion) {
    return NextResponse.json({ sesion: null, versiculos: [], secciones: [], analisis: null, sinPlan: false });
  }

  // Versículos del rango: mismo capítulo o capítulos distintos
  const inicio = sesion.inicio as unknown as { id: number; numero: number; id_capitulo: number };
  const fin = sesion.fin as unknown as { id: number; numero: number; id_capitulo: number };
  const inicioId = inicio.id;
  const finId = fin.id;
  const inicioCapitulo = inicio.id_capitulo;
  const finCapitulo = fin.id_capitulo;

  let versiculos: { id: number; numero: number; texto: string; id_capitulo: number; capitulo_numero: number }[] = [];

  if (inicioCapitulo === finCapitulo) {
    const inicioNum = inicio.numero;
    const finNum = fin.numero;

    const { data } = await supabase
      .from("bible_versiculos")
      .select("id, numero, texto, id_capitulo, capitulo:id_capitulo (numero)")
      .eq("id_capitulo", inicioCapitulo)
      .gte("numero", inicioNum)
      .lte("numero", finNum)
      .order("numero", { ascending: true });

    versiculos = (data ?? []).map((v) => ({
      id: v.id,
      numero: v.numero,
      texto: v.texto,
      id_capitulo: v.id_capitulo,
      capitulo_numero: (v.capitulo as unknown as { numero: number }).numero,
    }));
  } else {
    const { data } = await supabase
      .from("bible_versiculos")
      .select("id, numero, texto, id_capitulo, capitulo:id_capitulo (numero)")
      .gte("id", inicioId)
      .lte("id", finId)
      .order("id", { ascending: true });

    versiculos = (data ?? []).map((v) => ({
      id: v.id,
      numero: v.numero,
      texto: v.texto,
      id_capitulo: v.id_capitulo,
      capitulo_numero: (v.capitulo as unknown as { numero: number }).numero,
    }));
  }

  // Análisis de esta sesión (si ya existe, generado por el agente Python)
  const { data: analisis } = await supabase
    .from("bible_analisis")
    .select(`
      id, contexto_historico, resumen, temas_principales,
      conexiones, preguntas_reflexion, modelo_usado, created_at
    `)
    .eq("id_sesion", sesion.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Info del libro/capítulo del versículo de inicio para el título
  const [{ data: capInfo }, { data: capFinInfo }] = await Promise.all([
    supabase
      .from("bible_capitulos")
      .select("numero, id_libro, libro:id_libro ( nombre, abreviatura )")
      .eq("id", inicioCapitulo)
      .single(),
    supabase
      .from("bible_capitulos")
      .select("numero, libro:id_libro ( nombre, abreviatura )")
      .eq("id", finCapitulo)
      .single(),
  ]);

  // Secciones del rango (mismo libro, capítulos entre inicio y fin)
  const capInfoTyped = capInfo as unknown as { numero: number; id_libro: number; libro: { nombre: string; abreviatura: string } };
  const capFinTyped = capFinInfo as unknown as { numero: number; libro: { nombre: string; abreviatura: string } };

  const { data: secciones } = await supabase
    .from("bible_secciones")
    .select("versiculo_inicio, titulo, capitulo")
    .eq("id_libro", capInfoTyped.id_libro)
    .gte("capitulo", capInfoTyped.numero)
    .lte("capitulo", capFinTyped.numero)
    .order("capitulo", { ascending: true })
    .order("versiculo_inicio", { ascending: true });

  return NextResponse.json({
    sesion: {
      id: sesion.id,
      orden: sesion.orden,
      completada: sesion.completada,
      fecha_programada: sesion.fecha_programada,
      capituloInicio: capInfo,
      capituloFin: capFinInfo,
      versiculoInicioNum: inicio.numero,
      versiculoFinNum: fin.numero,
      planNombre: plan.nombre,
    },
    versiculos,
    secciones: secciones ?? [],
    analisis: analisis ?? null,
  });
}
