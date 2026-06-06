import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: notas, error } = await supabase
    .from("bible_notas")
    .select("id, abreviatura_libro, capitulo, versiculo_inicio, versiculo_fin, texto, color, updated_at")
    .eq("id_usuario", user.id)
    .order("abreviatura_libro")
    .order("capitulo")
    .order("versiculo_inicio");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const abreviaturas = Array.from(new Set((notas ?? []).map((n) => n.abreviatura_libro)));

  const librosMap: Record<string, { nombre: string; testamento: string; orden: number }> = {};
  if (abreviaturas.length > 0) {
    const { data: libros } = await supabase
      .from("bible_libros")
      .select("nombre, testamento, orden, abreviatura")
      .in("abreviatura", abreviaturas);

    for (const l of libros ?? []) {
      if (!librosMap[l.abreviatura]) librosMap[l.abreviatura] = l;
    }
  }

  const result = (notas ?? []).map((n) => ({
    ...n,
    libro: librosMap[n.abreviatura_libro] ?? {
      nombre: n.abreviatura_libro,
      testamento: "Antiguo",
      orden: 0,
    },
  }));

  return NextResponse.json({ notas: result });
}
