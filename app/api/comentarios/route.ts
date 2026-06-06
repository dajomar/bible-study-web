import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const libro = searchParams.get("libro");
  const capitulo = searchParams.get("capitulo");

  if (!libro || !capitulo) {
    return NextResponse.json({ error: "libro y capitulo requeridos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bible_comentarios")
    .select("id, versiculo_inicio, versiculo_fin, titulo_capitulo, titulo_seccion, texto, autor")
    .eq("abreviatura_libro", libro)
    .eq("capitulo", Number(capitulo))
    .order("versiculo_inicio", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ comentarios: data ?? [] });
}
