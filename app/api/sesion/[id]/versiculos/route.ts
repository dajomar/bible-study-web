import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const sesionId = Number(params.id);

  // Verificar que la sesión pertenece al usuario y obtener los extremos
  const { data: sesion } = await supabase
    .from("bible_sesiones")
    .select(`
      id,
      inicio:versiculo_inicio_id ( id, numero, id_capitulo ),
      fin:versiculo_fin_id ( id, numero, id_capitulo ),
      plan:id_plan ( id_usuario )
    `)
    .eq("id", sesionId)
    .single();

  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const plan = sesion.plan as unknown as { id_usuario: string };
  if (plan.id_usuario !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const inicio = sesion.inicio as unknown as { id: number; numero: number; id_capitulo: number };
  const fin = sesion.fin as unknown as { id: number; numero: number; id_capitulo: number };

  let versiculos: { id: number; numero: number; texto: string; id_capitulo: number; capitulo_numero: number }[] = [];

  if (inicio.id_capitulo === fin.id_capitulo) {
    // Mismo capítulo — rango por número
    const { data } = await supabase
      .from("bible_versiculos")
      .select("id, numero, texto, id_capitulo, capitulo:id_capitulo (numero)")
      .eq("id_capitulo", inicio.id_capitulo)
      .gte("numero", inicio.numero)
      .lte("numero", fin.numero)
      .order("numero", { ascending: true });
    versiculos = (data ?? []).map((v) => ({
      id: v.id,
      numero: v.numero,
      texto: v.texto,
      id_capitulo: v.id_capitulo,
      capitulo_numero: (v.capitulo as unknown as { numero: number }).numero,
    }));
  } else {
    // Capítulos distintos — rango por ID
    const { data } = await supabase
      .from("bible_versiculos")
      .select("id, numero, texto, id_capitulo, capitulo:id_capitulo (numero)")
      .gte("id", inicio.id)
      .lte("id", fin.id)
      .order("id", { ascending: true });
    versiculos = (data ?? []).map((v) => ({
      id: v.id,
      numero: v.numero,
      texto: v.texto,
      id_capitulo: v.id_capitulo,
      capitulo_numero: (v.capitulo as unknown as { numero: number }).numero,
    }));
  }

  return NextResponse.json({ versiculos });
}
