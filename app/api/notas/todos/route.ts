import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // ── 1. Notas del usuario ────────────────────────────────────
  const { data: notas, error } = await supabase
    .from("bible_notas")
    .select("id, abreviatura_libro, capitulo, versiculo_inicio, versiculo_fin, texto, color, updated_at")
    .eq("id_usuario", user.id)
    .order("abreviatura_libro")
    .order("capitulo")
    .order("versiculo_inicio");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notas?.length) return NextResponse.json({ notas: [] });

  const abreviaturas = Array.from(new Set(notas.map((n) => n.abreviatura_libro)));

  // ── 2. Versión bíblica del usuario ─────────────────────────
  const { data: perfil } = await supabase
    .from("bible_usuarios")
    .select("version_biblica")
    .eq("id", user.id)
    .single();
  const version = perfil?.version_biblica ?? "RVR1960";

  // ── 3. Libros para esa versión (info + id para el join) ─────
  const { data: libros } = await supabase
    .from("bible_libros")
    .select("id, abreviatura, nombre, testamento, orden")
    .eq("version", version)
    .in("abreviatura", abreviaturas);

  const libroIdPorAbrev: Record<string, number> = {};
  const librosMap: Record<string, { nombre: string; testamento: string; orden: number }> = {};
  for (const l of libros ?? []) {
    libroIdPorAbrev[l.abreviatura] = l.id;
    librosMap[l.abreviatura] = { nombre: l.nombre, testamento: l.testamento, orden: l.orden };
  }

  // ── 4. Capítulos de esos libros ────────────────────────────
  const libroIds = Object.values(libroIdPorAbrev);
  const { data: capitulos } = await supabase
    .from("bible_capitulos")
    .select("id, numero, id_libro")
    .in("id_libro", libroIds);

  // abrev_cap → capitulo_id
  const abrevPorLibroId: Record<number, string> = {};
  for (const [abrev, id] of Object.entries(libroIdPorAbrev)) abrevPorLibroId[Number(id)] = abrev;

  const capIdMap: Record<string, number> = {};
  for (const c of capitulos ?? []) {
    const abrev = abrevPorLibroId[c.id_libro];
    if (abrev) capIdMap[`${abrev}_${c.numero}`] = c.id;
  }

  // ── 5. Versículos de los capítulos necesarios ───────────────
  const capIds = Array.from(new Set(
    notas.map((n) => capIdMap[`${n.abreviatura_libro}_${n.capitulo}`]).filter(Boolean)
  ));

  const { data: versiculos } = capIds.length
    ? await supabase
        .from("bible_versiculos")
        .select("id_capitulo, numero, texto")
        .in("id_capitulo", capIds)
    : { data: [] };

  // capitulo_id_numero → texto
  const versiMap: Record<string, string> = {};
  for (const v of versiculos ?? []) versiMap[`${v.id_capitulo}_${v.numero}`] = v.texto;

  // ── 6. Ensamblar resultado ──────────────────────────────────
  const result = notas.map((n) => {
    const capId = capIdMap[`${n.abreviatura_libro}_${n.capitulo}`];
    const versiculos_texto: string[] = [];
    if (capId) {
      for (let v = n.versiculo_inicio; v <= n.versiculo_fin; v++) {
        const txt = versiMap[`${capId}_${v}`];
        if (txt) versiculos_texto.push(txt);
      }
    }
    return {
      ...n,
      versiculos_texto,
      libro: librosMap[n.abreviatura_libro] ?? { nombre: n.abreviatura_libro, testamento: "Antiguo", orden: 0 },
    };
  });

  return NextResponse.json({ notas: result });
}
