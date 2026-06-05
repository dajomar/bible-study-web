import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { email, password, nombre } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña requeridos" },
      { status: 400 }
    );
  }

  // Crear usuario via Admin API — no envía email de confirmación, sin rate limit
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirma automáticamente sin enviar email
    user_metadata: { nombre: nombre || "" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Crear fila en bible_usuarios con el mismo UUID de Auth
  const { error: dbError } = await supabase
    .from("bible_usuarios")
    .insert({ id: data.user.id, email, nombre: nombre || null });

  if (dbError) {
    // Si ya existe la fila (registro previo parcial), no es error crítico
    if (!dbError.message.includes("duplicate key")) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { usuario: { id: data.user.id, email } },
    { status: 201 }
  );
}
