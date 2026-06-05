import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [{ data: template, error: tError }, { data: fases, error: fError }] = await Promise.all([
    supabase
      .from("bible_planes_templates")
      .select("id, titulo, descripcion, para_quien, nivel, es_completo, duracion_estimada_dias, icono, color_acento, recomendado, orden")
      .eq("id", params.id)
      .eq("activo", true)
      .single(),
    supabase
      .from("bible_planes_templates_fases")
      .select(`
        id, numero, titulo, descripcion, color_acento,
        sesiones:bible_planes_templates_sesiones ( id, orden, abreviatura_libro, capitulo_inicio, capitulo_fin )
      `)
      .eq("id_template", params.id)
      .order("numero"),
  ]);

  if (tError || !template) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });
  if (fError) return NextResponse.json({ error: fError.message }, { status: 500 });

  return NextResponse.json({ template, fases });
}
