import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: usuario } = await supabase
    .from("bible_usuarios")
    .select("version_biblica")
    .eq("id", user.id)
    .single();

  const version = usuario?.version_biblica ?? "RVR1960";

  const { searchParams } = request.nextUrl;
  const libroId = searchParams.get("libro_id");
  const capituloNum = searchParams.get("capitulo");

  // Verificar que el libro pertenece a la versión del usuario
  if (libroId) {
    const { data: libro } = await supabase
      .from("bible_libros")
      .select("id, version")
      .eq("id", libroId)
      .eq("version", version)
      .single();

    if (!libro) {
      return NextResponse.json({ error: "Libro no encontrado en esta versión" }, { status: 404 });
    }
  }

  // Capítulos del libro
  if (libroId && !capituloNum) {
    const { data, error } = await supabase
      .from("bible_capitulos")
      .select("id, numero")
      .eq("id_libro", libroId)
      .order("numero", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ capitulos: data });
  }

  // Versículos del capítulo
  if (libroId && capituloNum) {
    const { data: capitulo, error: capError } = await supabase
      .from("bible_capitulos")
      .select("id, numero")
      .eq("id_libro", libroId)
      .eq("numero", capituloNum)
      .single();

    if (capError || !capitulo) {
      return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });
    }

    const [{ data: versiculos, error: verError }, { data: secciones }] = await Promise.all([
      supabase
        .from("bible_versiculos")
        .select("id, numero, texto")
        .eq("id_capitulo", capitulo.id)
        .order("numero", { ascending: true }),
      supabase
        .from("bible_secciones")
        .select("versiculo_inicio, titulo")
        .eq("id_libro", libroId)
        .eq("capitulo", capituloNum)
        .order("versiculo_inicio", { ascending: true }),
    ]);

    if (verError) return NextResponse.json({ error: verError.message }, { status: 500 });
    return NextResponse.json({ capitulo, versiculos, secciones: secciones ?? [] });
  }

  return NextResponse.json({ error: "Parámetro libro_id requerido" }, { status: 400 });
}
