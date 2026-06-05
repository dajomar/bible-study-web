import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

const VERSIONES_VALIDAS = ["RV1909", "RVR1960", "NVI", "TLA"];

export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // version override opcional — permite cambio local sin afectar el perfil
  const versionParam = request.nextUrl.searchParams.get("version");
  let version: string;
  if (versionParam && VERSIONES_VALIDAS.includes(versionParam)) {
    version = versionParam;
  } else {
    const { data: usuario } = await supabase
      .from("bible_usuarios")
      .select("version_biblica")
      .eq("id", user.id)
      .single();
    version = usuario?.version_biblica ?? "RVR1960";
  }

  const { data, error } = await supabase
    .from("bible_libros")
    .select("id, orden, nombre, abreviatura, testamento")
    .eq("version", version)
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ libros: data, version });
}
