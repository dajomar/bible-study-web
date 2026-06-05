import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { passwordActual, passwordNueva } = await request.json();

  if (!passwordActual || !passwordNueva) {
    return NextResponse.json({ error: "Ambas contraseñas son requeridas" }, { status: 400 });
  }

  if (passwordNueva.length < 6) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  // Verificar contraseña actual intentando hacer login
  const { error: loginError } = await authClient.auth.signInWithPassword({
    email: user.email!,
    password: passwordActual,
  });

  if (loginError) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  // Actualizar con la nueva contraseña via Admin API
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: passwordNueva,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
