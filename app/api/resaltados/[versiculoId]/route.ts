import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { versiculoId: string } }
) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const versiculoId = Number(params.versiculoId);
  if (!versiculoId) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const { error } = await supabase
    .from("bible_resaltados")
    .delete()
    .eq("id_usuario", user.id)
    .eq("id_versiculo", versiculoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
