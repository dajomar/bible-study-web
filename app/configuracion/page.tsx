"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axios";

interface Usuario { id: string; email: string; nombre: string | null; created_at: string }
interface Stats { totalPlanes: number; sesionesCompletadas: number; totalAnalisis: number }
interface UsuarioData { usuario: Usuario; stats: Stats }

export default function ConfiguracionPage() {
  const [data, setData] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    apiClient
      .get<UsuarioData>("/api/usuario")
      .then((res) => {
        setData(res.data);
        setNombre(res.data.usuario.nombre ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    try {
      const res = await apiClient.put<{ usuario: Usuario }>("/api/usuario", { nombre });
      setData((prev) => prev ? { ...prev, usuario: res.data.usuario } : prev);
      setMensaje({ tipo: "ok", texto: "Nombre actualizado correctamente" });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar el nombre" });
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  const { usuario, stats } = data;
  const miembroDesde = new Date(usuario.created_at).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="font-lora text-3xl text-[#2C2C2C]">Configuración</h1>
        <p className="font-inter text-sm text-[#8A8A8A] mt-1">Miembro desde {miembroDesde}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "Planes", valor: stats.totalPlanes },
          { label: "Sesiones completadas", valor: stats.sesionesCompletadas },
          { label: "Análisis recibidos", valor: stats.totalAnalisis },
        ].map(({ label, valor }) => (
          <div key={label} className="border border-[#E8E4DF] rounded-xl p-5 text-center">
            <p className="font-lora text-3xl text-[#4A6FA5] mb-1">{valor}</p>
            <p className="font-inter text-xs text-[#8A8A8A]">{label}</p>
          </div>
        ))}
      </div>

      {/* Perfil */}
      <div className="border border-[#E8E4DF] rounded-xl p-6">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-5">Perfil</p>

        <form onSubmit={handleGuardar} className="space-y-4">
          {/* Email — solo lectura */}
          <div>
            <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={usuario.email}
              disabled
              className="w-full border border-[#E8E4DF] rounded-lg px-4 py-2.5 font-inter text-sm text-[#8A8A8A] bg-[#FAF8F5] opacity-60 cursor-not-allowed"
            />
          </div>

          {/* Nombre — editable */}
          <div>
            <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setMensaje(null); }}
              placeholder="Tu nombre"
              className="w-full border border-[#E8E4DF] rounded-lg px-4 py-2.5 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
            />
          </div>

          {/* Feedback */}
          {mensaje && (
            <p className={`font-inter text-sm ${mensaje.tipo === "ok" ? "text-[#4A6FA5]" : "text-red-500"}`}>
              {mensaje.texto}
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={guardando || !nombre.trim()}
              className="bg-[#4A6FA5] text-white font-inter text-sm px-5 py-2.5 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="h-8 w-44 bg-[#E8E4DF] rounded animate-pulse mb-2" />
        <div className="h-3 w-36 bg-[#E8E4DF] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
            <div className="h-8 w-10 mx-auto bg-[#E8E4DF] rounded animate-pulse mb-2" />
            <div className="h-3 w-20 mx-auto bg-[#E8E4DF] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="border border-[#E8E4DF] rounded-xl p-6 space-y-4">
        <div className="h-3 w-16 bg-[#E8E4DF] rounded animate-pulse" />
        <div className="h-10 bg-[#E8E4DF] rounded-lg animate-pulse" />
        <div className="h-10 bg-[#E8E4DF] rounded-lg animate-pulse" />
      </div>
    </main>
  );
}
