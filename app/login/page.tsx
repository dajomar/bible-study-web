"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

type Mode = "login" | "registro";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await apiClient.post("/api/auth/login", { email, password });
      } else {
        await apiClient.post("/api/auth/registro", { email, password, nombre });
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            "Error inesperado";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-lora text-3xl text-[#2C2C2C] mb-2">
            Estudio Bíblico
          </h1>
          <p className="font-inter text-sm text-[#8A8A8A]">
            {mode === "login" ? "Inicia sesión para continuar" : "Crea tu cuenta"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8E4DF] rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "registro" && (
              <div>
                <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full border border-[#E8E4DF] rounded-lg px-4 py-2.5 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full border border-[#E8E4DF] rounded-lg px-4 py-2.5 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
              />
            </div>

            <div>
              <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full border border-[#E8E4DF] rounded-lg px-4 py-2.5 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
              />
            </div>

            {error && (
              <p className="font-inter text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4A6FA5] text-white font-inter text-sm font-medium py-2.5 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
            >
              {loading
                ? "Cargando..."
                : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "registro" : "login"); setError(""); }}
              className="font-inter text-sm text-[#4A6FA5] hover:underline"
            >
              {mode === "login"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
