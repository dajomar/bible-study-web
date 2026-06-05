import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Escribe al menos 3 caracteres" }, { status: 400 });
  }

  // Buscar versículos cuyo texto contenga la frase (case-insensitive, sin tildes)
  const { data, error } = await supabase
    .from("bible_versiculos")
    .select(`
      id,
      numero,
      texto,
      capitulo:id_capitulo (
        numero,
        libro:id_libro ( nombre )
      )
    `)
    .ilike("texto", `%${q}%`)
    .limit(30)
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ resultados: data ?? [] });
}
