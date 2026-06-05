import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const VERSIONES_VALIDAS = ["RV1909", "RVR1960", "NVI", "TLA"];
  const { searchParams } = request.nextUrl;

  const versionParam = searchParams.get("version");
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
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Escribe al menos 3 caracteres" }, { status: 400 });
  }

  // Intentar búsqueda accent-insensitive con RPC
  const rpcResult = await supabase.rpc("buscar_versiculos_v2", {
    termino: q,
    p_version: version,
  });

  let resultados: { id: number; numero: number; texto: string; capitulo: { numero: number; libro: { nombre: string } } }[] = [];

  if (!rpcResult.error && rpcResult.data) {
    resultados = (rpcResult.data as { id: number; numero: number; texto: string; capitulo_numero: number; libro_nombre: string }[]).map((r) => ({
      id: r.id,
      numero: r.numero,
      texto: r.texto,
      capitulo: { numero: r.capitulo_numero, libro: { nombre: r.libro_nombre } },
    }));
  } else {
    // Fallback: ilike básico si el RPC no está disponible
    const { data: rawData, error: ilikeError } = await supabase
      .from("bible_versiculos")
      .select("id, numero, texto, capitulo:id_capitulo(numero, libro:id_libro(nombre, version))")
      .ilike("texto", `%${q}%`)
      .limit(60);

    if (ilikeError) return NextResponse.json({ error: ilikeError.message }, { status: 500 });

    resultados = (rawData ?? [])
      .filter((v) => {
        const cap = v.capitulo as unknown as { numero: number; libro: { nombre: string; version: string } };
        return cap?.libro?.version === version;
      })
      .slice(0, 30)
      .map((v) => {
        const cap = v.capitulo as unknown as { numero: number; libro: { nombre: string } };
        return { id: v.id, numero: v.numero, texto: v.texto, capitulo: { numero: cap.numero, libro: { nombre: cap.libro.nombre } } };
      });
  }

  return NextResponse.json({ resultados, version });
}
