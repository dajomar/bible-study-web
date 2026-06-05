import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("bible_resaltados")
    .select(`
      id_versiculo,
      color,
      bible_versiculos (
        numero,
        texto,
        bible_capitulos (
          numero,
          bible_libros (
            nombre,
            testamento,
            orden,
            abreviatura
          )
        )
      )
    `)
    .eq("id_usuario", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resaltados = (rows ?? []).map((r: any) => ({
    id_versiculo: r.id_versiculo,
    color: r.color,
    numero: r.bible_versiculos?.numero,
    texto: r.bible_versiculos?.texto,
    capitulo: r.bible_versiculos?.bible_capitulos?.numero,
    libro: {
      nombre: r.bible_versiculos?.bible_capitulos?.bible_libros?.nombre,
      testamento: r.bible_versiculos?.bible_capitulos?.bible_libros?.testamento,
      orden: r.bible_versiculos?.bible_capitulos?.bible_libros?.orden,
      abreviatura: r.bible_versiculos?.bible_capitulos?.bible_libros?.abreviatura,
    },
  }));

  return NextResponse.json({ resaltados });
}
