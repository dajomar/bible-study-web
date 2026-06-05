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
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Escribe al menos 3 caracteres" }, { status: 400 });
  }

  // Buscar versículos filtrando por versión via join con bible_libros
  const { data, error } = await supabase
    .from("bible_versiculos")
    .select(`
      id,
      numero,
      texto,
      capitulo:id_capitulo (
        numero,
        libro:id_libro ( nombre, version )
      )
    `)
    .ilike("texto", `%${q}%`)
    .limit(60)
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtrar en memoria por versión (Supabase no permite filtrar sobre relaciones anidadas con .eq)
  const resultados = (data ?? []).filter((v) => {
    const cap = v.capitulo as unknown as { numero: number; libro: { nombre: string; version: string } };
    return cap?.libro?.version === version;
  }).slice(0, 30);

  return NextResponse.json({ resultados, version });
}
