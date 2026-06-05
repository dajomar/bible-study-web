"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

interface Usuario { id: string; email: string; nombre: string | null; version_biblica: string; created_at: string }
interface Stats { totalPlanes: number; sesionesCompletadas: number; totalAnalisis: number }
interface UsuarioData { usuario: Usuario; stats: Stats }

export default function ConfiguracionPage() {
  const [data, setData] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<UsuarioData>("/api/usuario")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  const { usuario, stats } = data;
  const miembroDesde = new Date(usuario.created_at).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
      <div className="mb-2">
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Configuración</h1>
        <p className="font-inter text-sm text-[#8A8A8A] mt-1">Miembro desde {miembroDesde}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Planes", valor: stats.totalPlanes },
          { label: "Completadas", valor: stats.sesionesCompletadas },
          { label: "Análisis", valor: stats.totalAnalisis },
        ].map(({ label, valor }) => (
          <div key={label} className="border border-[#E8E4DF] rounded-xl p-4 md:p-5 text-center">
            <p className="font-lora text-2xl md:text-3xl text-[#4A6FA5] mb-1">{valor}</p>
            <p className="font-inter text-xs text-[#8A8A8A] leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Perfil */}
      <PerfilForm usuario={usuario} onActualizado={(u) => setData((prev) => prev ? { ...prev, usuario: u } : prev)} />

      {/* Versión bíblica */}
      <VersionBiblicaForm usuario={usuario} onActualizado={(u) => setData((prev) => prev ? { ...prev, usuario: u } : prev)} />

      {/* Cambiar contraseña */}
      <CambiarPasswordForm />

      {/* Zona de peligro */}
      <ZonaPeligro />
    </main>
  );
}

/* ── Perfil ─────────────────────────────────────────────── */

function PerfilForm({ usuario, onActualizado }: { usuario: Usuario; onActualizado: (u: Usuario) => void }) {
  const [nombre, setNombre] = useState(usuario.nombre ?? "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    try {
      const res = await apiClient.put<{ usuario: Usuario }>("/api/usuario", { nombre });
      onActualizado(res.data.usuario);
      setMensaje({ tipo: "ok", texto: "Nombre actualizado correctamente" });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar el nombre" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-5">Perfil</p>
      <form onSubmit={handleGuardar} className="space-y-4">
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">Email</label>
          <input
            type="email"
            value={usuario.email}
            disabled
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#8A8A8A] bg-[#FAF8F5] opacity-60 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setMensaje(null); }}
            placeholder="Tu nombre"
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
          />
        </div>
        {mensaje && (
          <p className={`font-inter text-sm ${mensaje.tipo === "ok" ? "text-[#4A6FA5]" : "text-red-500"}`}>
            {mensaje.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={guardando || !nombre.trim()}
          className="w-full md:w-auto bg-[#4A6FA5] text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

/* ── Versión bíblica ────────────────────────────────────── */

const VERSIONES = [
  { valor: "RV1909", label: "Reina Valera 1909", descripcion: "Texto clásico" },
  { valor: "RVR1960", label: "Reina Valera 1960", descripcion: "Revisión moderna del texto clásico" },
  { valor: "NVI", label: "Nueva Versión Internacional", descripcion: "Lenguaje contemporáneo" },
  { valor: "TLA", label: "Traducción en Lenguaje Actual", descripcion: "Lenguaje sencillo y directo" },
];

function VersionBiblicaForm({ usuario, onActualizado }: { usuario: Usuario; onActualizado: (u: Usuario) => void }) {
  const [version, setVersion] = useState(usuario.version_biblica ?? "RVR1960");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function handleCambiar(nuevaVersion: string) {
    setVersion(nuevaVersion);
    setMensaje(null);
    setGuardando(true);
    try {
      const res = await apiClient.put<{ usuario: Usuario }>("/api/usuario", { version_biblica: nuevaVersion });
      onActualizado(res.data.usuario);
      setMensaje({ tipo: "ok", texto: "Versión actualizada" });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar la versión" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-5">Versión bíblica</p>
      <div className="space-y-2">
        {VERSIONES.map((v) => {
          const activa = version === v.valor;
          return (
            <button
              key={v.valor}
              onClick={() => !activa && !guardando && handleCambiar(v.valor)}
              disabled={guardando}
              className={`w-full text-left flex items-center justify-between px-4 py-3.5 rounded-lg border transition-colors ${
                activa
                  ? "border-[#4A6FA5] bg-[#4A6FA5]/5"
                  : "border-[#E8E4DF] hover:bg-[#FAF8F5]"
              } disabled:opacity-50`}
            >
              <div>
                <p className={`font-inter text-sm ${activa ? "text-[#4A6FA5] font-medium" : "text-[#2C2C2C]"}`}>
                  {v.label}
                </p>
                <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">{v.descripcion}</p>
              </div>
              {activa && (
                <span className="font-inter text-xs text-[#4A6FA5] shrink-0 ml-3">✓ Activa</span>
              )}
            </button>
          );
        })}
      </div>
      {mensaje && (
        <p className={`font-inter text-sm mt-4 ${mensaje.tipo === "ok" ? "text-[#4A6FA5]" : "text-red-500"}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}

/* ── Cambiar contraseña ─────────────────────────────────── */

function CambiarPasswordForm() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);

    if (nueva !== confirmar) {
      setMensaje({ tipo: "error", texto: "Las contraseñas nuevas no coinciden" });
      return;
    }
    if (nueva.length < 6) {
      setMensaje({ tipo: "error", texto: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setGuardando(true);
    try {
      await apiClient.post("/api/auth/cambiar-password", {
        passwordActual: actual,
        passwordNueva: nueva,
      });
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada correctamente" });
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Error al cambiar la contraseña";
      setMensaje({ tipo: "error", texto: msg });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-5">Contraseña</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Contraseña actual
          </label>
          <input
            type="password"
            value={actual}
            onChange={(e) => { setActual(e.target.value); setMensaje(null); }}
            placeholder="••••••••"
            required
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
          />
        </div>
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={nueva}
            onChange={(e) => { setNueva(e.target.value); setMensaje(null); }}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
          />
        </div>
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => { setConfirmar(e.target.value); setMensaje(null); }}
            placeholder="••••••••"
            required
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
          />
        </div>
        {mensaje && (
          <p className={`font-inter text-sm ${mensaje.tipo === "ok" ? "text-[#4A6FA5]" : "text-red-500"}`}>
            {mensaje.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={guardando || !actual || !nueva || !confirmar}
          className="w-full md:w-auto bg-[#4A6FA5] text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
        >
          {guardando ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}

/* ── Zona de peligro ────────────────────────────────────── */

function ZonaPeligro() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [inputConfirm, setInputConfirm] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  async function handleEliminar() {
    setError("");
    setEliminando(true);
    try {
      await apiClient.delete("/api/usuario");
      router.push("/login");
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Error al eliminar la cuenta";
      setError(msg);
      setEliminando(false);
    }
  }

  return (
    <div className="border border-red-200 rounded-xl p-5 md:p-6">
      <p className="font-inter text-xs text-red-400 uppercase tracking-wide mb-1">Zona de peligro</p>
      <p className="font-inter text-sm text-[#8A8A8A] mb-5">
        Eliminar tu cuenta borrará permanentemente todos tus planes, sesiones y análisis. Esta acción no se puede deshacer.
      </p>

      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          className="w-full md:w-auto font-inter text-sm text-red-500 border border-red-300 px-5 py-3 rounded-lg hover:bg-red-50 transition-colors"
        >
          Eliminar mi cuenta
        </button>
      ) : (
        <div className="space-y-4">
          <p className="font-inter text-sm text-[#2C2C2C]">
            Escribe <span className="font-medium">eliminar</span> para confirmar:
          </p>
          <input
            type="text"
            value={inputConfirm}
            onChange={(e) => { setInputConfirm(e.target.value); setError(""); }}
            placeholder="eliminar"
            className="w-full border border-red-200 rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-red-400 transition-colors"
          />
          {error && <p className="font-inter text-sm text-red-500">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleEliminar}
              disabled={inputConfirm !== "eliminar" || eliminando}
              className="w-full sm:w-auto bg-red-500 text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              {eliminando ? "Eliminando..." : "Confirmar eliminación"}
            </button>
            <button
              onClick={() => { setConfirmando(false); setInputConfirm(""); setError(""); }}
              className="w-full sm:w-auto font-inter text-sm text-[#8A8A8A] hover:text-[#2C2C2C] py-3 transition-colors text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
      <div>
        <div className="h-8 w-44 bg-[#E8E4DF] rounded animate-pulse mb-2" />
        <div className="h-3 w-36 bg-[#E8E4DF] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-[#E8E4DF] rounded-xl p-4">
            <div className="h-8 w-8 mx-auto bg-[#E8E4DF] rounded animate-pulse mb-2" />
            <div className="h-3 w-16 mx-auto bg-[#E8E4DF] rounded animate-pulse" />
          </div>
        ))}
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-[#E8E4DF] rounded-xl p-5 space-y-4">
          <div className="h-3 w-20 bg-[#E8E4DF] rounded animate-pulse" />
          <div className="h-11 bg-[#E8E4DF] rounded-lg animate-pulse" />
          <div className="h-11 bg-[#E8E4DF] rounded-lg animate-pulse" />
        </div>
      ))}
    </main>
  );
}
