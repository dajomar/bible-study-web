import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const libroId = searchParams.get("libro_id");
  const capituloNum = searchParams.get("capitulo");

  // Sin parámetros → devolver lista de capítulos del libro
  if (libroId && !capituloNum) {
    const { data, error } = await supabase
      .from("bible_capitulos")
      .select("id, numero")
      .eq("id_libro", libroId)
      .order("numero", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ capitulos: data });
  }

  // Con libro y capítulo → devolver versículos
  if (libroId && capituloNum) {
    // Buscar el id del capítulo
    const { data: capitulo, error: capError } = await supabase
      .from("bible_capitulos")
      .select("id, numero")
      .eq("id_libro", libroId)
      .eq("numero", capituloNum)
      .single();

    if (capError || !capitulo) {
      return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });
    }

    const { data: versiculos, error: verError } = await supabase
      .from("bible_versiculos")
      .select("id, numero, texto")
      .eq("id_capitulo", capitulo.id)
      .order("numero", { ascending: true });

    if (verError) {
      return NextResponse.json({ error: verError.message }, { status: 500 });
    }

    return NextResponse.json({ capitulo, versiculos });
  }

  return NextResponse.json(
    { error: "Parámetro libro_id requerido" },
    { status: 400 }
  );
}
