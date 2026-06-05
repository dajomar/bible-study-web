import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

const VERSIONES_VALIDAS = ["RV1909", "RVR1960", "NVI", "TLA"];

export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const libroNombre = searchParams.get("libro")?.trim();
  const capituloNum = Number(searchParams.get("capitulo"));
  const versionesParam = searchParams.get("versiones") ?? "RVR1960";

  if (!libroNombre || !capituloNum) {
    return NextResponse.json({ error: "Parámetros requeridos: libro, capitulo" }, { status: 400 });
  }

  const versiones = versionesParam
    .split(",")
    .map((v) => v.trim())
    .filter((v) => VERSIONES_VALIDAS.includes(v));

  if (versiones.length === 0) {
    return NextResponse.json({ error: "Ninguna versión válida indicada" }, { status: 400 });
  }

  const resultados = await Promise.all(
    versiones.map(async (version) => {
      // Buscar libro por nombre en esta versión (insensible a mayúsculas)
      const { data: libros } = await supabase
        .from("bible_libros")
        .select("id, nombre, abreviatura")
        .eq("version", version)
        .ilike("nombre", libroNombre);

      // Fallback: buscar por abreviatura si no hay coincidencia por nombre
      let libro = libros?.[0] ?? null;
      if (!libro) {
        const { data: porAbrev } = await supabase
          .from("bible_libros")
          .select("id, nombre, abreviatura")
          .eq("version", version)
          .ilike("abreviatura", libroNombre);
        libro = porAbrev?.[0] ?? null;
      }

      if (!libro) {
        return { version, versiculos: [], secciones: [], error: "Libro no encontrado en esta versión" };
      }

      // Buscar capítulo
      const { data: capitulo } = await supabase
        .from("bible_capitulos")
        .select("id, numero")
        .eq("id_libro", libro.id)
        .eq("numero", capituloNum)
        .single();

      if (!capitulo) {
        return { version, versiculos: [], secciones: [], error: `Capítulo ${capituloNum} no encontrado` };
      }

      // Versículos y secciones en paralelo
      const [{ data: versiculos }, { data: secciones }] = await Promise.all([
        supabase
          .from("bible_versiculos")
          .select("id, numero, texto")
          .eq("id_capitulo", capitulo.id)
          .order("numero", { ascending: true }),
        supabase
          .from("bible_secciones")
          .select("versiculo_inicio, titulo")
          .eq("id_libro", libro.id)
          .eq("capitulo", capituloNum)
          .order("versiculo_inicio", { ascending: true }),
      ]);

      return {
        version,
        libroNombre: libro.nombre,
        versiculos: versiculos ?? [],
        secciones: secciones ?? [],
      };
    })
  );

  return NextResponse.json({ resultados });
}
