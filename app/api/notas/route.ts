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
    .from("bible_notas")
    .select("*")
    .eq("id_usuario", user.id)
    .eq("abreviatura_libro", libro)
    .eq("capitulo", Number(capitulo))
    .order("versiculo_inicio");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notas: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const { abreviatura_libro, capitulo, versiculo_inicio, versiculo_fin, texto, color } = body;

  if (!abreviatura_libro || !capitulo || !versiculo_inicio || !versiculo_fin || !texto?.trim()) {
    return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
  }

  const COLORES_VALIDOS = ["amarillo", "verde", "azul", "rosado"];
  if (color && !COLORES_VALIDOS.includes(color)) {
    return NextResponse.json({ error: "Color no válido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bible_notas")
    .upsert(
      {
        id_usuario: user.id,
        abreviatura_libro,
        capitulo: Number(capitulo),
        versiculo_inicio: Number(versiculo_inicio),
        versiculo_fin: Number(versiculo_fin),
        texto: texto.trim(),
        color: color ?? "amarillo",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id_usuario,abreviatura_libro,capitulo,versiculo_inicio" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ nota: data }, { status: 201 });
}
