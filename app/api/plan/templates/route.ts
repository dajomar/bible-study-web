import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("bible_planes_templates")
    .select(`
      id, titulo, descripcion, para_quien, nivel, es_completo,
      duracion_estimada_dias, icono, color_acento, recomendado, orden,
      fases:bible_planes_templates_fases ( id, numero, titulo, color_acento )
    `)
    .eq("activo", true)
    .order("orden");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ templates: data });
}
