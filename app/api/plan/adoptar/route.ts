import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

const VERSIONES_VALIDAS = ["RV1909", "RVR1960", "NVI", "TLA"];

interface SesionTemplate {
  orden: number;
  abreviatura_libro: string;
  capitulo_inicio: number;
  capitulo_fin: number;
}

export async function POST(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const { id_template, version_biblica, nombre_plan } = body;

  if (!id_template || !version_biblica || !nombre_plan?.trim()) {
    return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
  }
  if (!VERSIONES_VALIDAS.includes(version_biblica)) {
    return NextResponse.json({ error: "Versión bíblica no válida" }, { status: 400 });
  }

  // 1. Obtener descripción del template
  const { data: template } = await supabase
    .from("bible_planes_templates")
    .select("descripcion")
    .eq("id", id_template)
    .single();

  // 2. Obtener todas las sesiones del template (vía fases, ordenadas)
  const { data: fases, error: fError } = await supabase
    .from("bible_planes_templates_fases")
    .select("numero, sesiones:bible_planes_templates_sesiones ( orden, abreviatura_libro, capitulo_inicio, capitulo_fin )")
    .eq("id_template", id_template)
    .order("numero");

  if (fError || !fases?.length) {
    return NextResponse.json({ error: "Template no encontrado o sin sesiones" }, { status: 404 });
  }

  // Aplanar sesiones en orden global (fases ordenadas → sesiones ordenadas por orden interno)
  const sesiones: SesionTemplate[] = fases.flatMap((f) =>
    (f.sesiones as SesionTemplate[]).slice().sort((a, b) => a.orden - b.orden)
  );

  if (!sesiones.length) {
    return NextResponse.json({ error: "El template no tiene sesiones" }, { status: 400 });
  }

  // 2. Obtener IDs de libros para las abreviaturas usadas en esta versión
  const abrevs = Array.from(new Set(sesiones.map((s) => s.abreviatura_libro)));
  const { data: libros, error: lError } = await supabase
    .from("bible_libros")
    .select("id, abreviatura")
    .eq("version", version_biblica)
    .in("abreviatura", abrevs);

  if (lError || !libros?.length) {
    return NextResponse.json({ error: "No se encontraron libros para esta versión" }, { status: 500 });
  }

  const libroMap: Record<string, number> = Object.fromEntries(libros.map((l) => [l.abreviatura, l.id]));

  // 3. Obtener todos los capítulos de esos libros de una vez
  const libroIds = libros.map((l) => l.id);
  const { data: capitulos, error: cError } = await supabase
    .from("bible_capitulos")
    .select("id, numero, id_libro")
    .in("id_libro", libroIds);

  if (cError || !capitulos) {
    return NextResponse.json({ error: "Error al cargar capítulos" }, { status: 500 });
  }

  // Mapa: `${libroId}_${numero}` → capituloId
  const capMap: Record<string, number> = Object.fromEntries(
    capitulos.map((c) => [`${c.id_libro}_${c.numero}`, c.id])
  );

  // 4. Obtener primer versículo (numero=1) de cada capítulo inicio único
  const capInicioIds = Array.from(new Set(
    sesiones
      .map((s) => capMap[`${libroMap[s.abreviatura_libro]}_${s.capitulo_inicio}`])
      .filter(Boolean)
  ));

  const { data: primerosVersos, error: pvError } = await supabase
    .from("bible_versiculos")
    .select("id, id_capitulo")
    .in("id_capitulo", capInicioIds)
    .eq("numero", 1);

  if (pvError) return NextResponse.json({ error: "Error al resolver versículos de inicio" }, { status: 500 });

  const inicioMap: Record<number, number> = Object.fromEntries(
    (primerosVersos ?? []).map((v) => [v.id_capitulo, v.id])
  );

  // 5. Obtener último versículo de cada capítulo fin único (en paralelo)
  const capFinIds = Array.from(new Set(
    sesiones
      .map((s) => capMap[`${libroMap[s.abreviatura_libro]}_${s.capitulo_fin}`])
      .filter(Boolean)
  ));

  const ultimosVersos = await Promise.all(
    capFinIds.map((capId) =>
      supabase
        .from("bible_versiculos")
        .select("id, id_capitulo")
        .eq("id_capitulo", capId)
        .order("numero", { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => data)
    )
  );

  const finMap: Record<number, number> = Object.fromEntries(
    ultimosVersos.filter(Boolean).map((v) => [v!.id_capitulo, v!.id])
  );

  // 6. Crear el plan
  const { data: plan, error: planError } = await supabase
    .from("bible_planes")
    .insert({ id_usuario: user.id, nombre: nombre_plan.trim(), descripcion: template?.descripcion ?? null, activo: true })
    .select("id")
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Error al crear el plan" }, { status: 500 });
  }

  // 7. Construir e insertar sesiones en lotes de 500
  // Fecha de inicio: hoy; si es domingo (0) avanzar al lunes
  const fechaInicio = new Date();
  fechaInicio.setHours(0, 0, 0, 0);
  while (fechaInicio.getDay() === 0) fechaInicio.setDate(fechaInicio.getDate() + 1);
  const fechaCursor = new Date(fechaInicio);
  let primeraValida = true;

  const sesionesInsert = sesiones
    .map((s, i) => {
      const libroId = libroMap[s.abreviatura_libro];
      if (!libroId) return null;
      const capInicioId = capMap[`${libroId}_${s.capitulo_inicio}`];
      const capFinId = capMap[`${libroId}_${s.capitulo_fin}`];
      const vsIni = inicioMap[capInicioId];
      const vsFin = finMap[capFinId];
      if (!vsIni || !vsFin) return null;

      // Avanzar fecha (excepto la primera sesión válida)
      if (!primeraValida) {
        fechaCursor.setDate(fechaCursor.getDate() + 1);
        while (fechaCursor.getDay() === 0) fechaCursor.setDate(fechaCursor.getDate() + 1);
      }
      primeraValida = false;
      const fecha_programada = fechaCursor.toISOString().split("T")[0];

      return {
        id_plan: plan.id,
        orden: i + 1,
        versiculo_inicio_id: vsIni,
        versiculo_fin_id: vsFin,
        completada: false,
        fecha_programada,
      };
    })
    .filter(Boolean) as {
      id_plan: number;
      orden: number;
      versiculo_inicio_id: number;
      versiculo_fin_id: number;
      completada: boolean;
      fecha_programada: string;
    }[];

  const BATCH = 500;
  for (let i = 0; i < sesionesInsert.length; i += BATCH) {
    const { error: sError } = await supabase
      .from("bible_sesiones")
      .insert(sesionesInsert.slice(i, i + BATCH));
    if (sError) return NextResponse.json({ error: "Error al insertar sesiones" }, { status: 500 });
  }

  return NextResponse.json({ id_plan: plan.id, sesiones_creadas: sesionesInsert.length });
}
