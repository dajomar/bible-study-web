"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

interface CapituloInfo {
  numero: number;
  libro: { nombre: string; abreviatura: string };
}

interface Sesion {
  id: number;
  orden: number;
  completada: boolean;
  fecha_programada: string | null;
  capituloInicio: CapituloInfo;
  capituloFin: CapituloInfo;
  versiculoInicioNum: number;
  versiculoFinNum: number;
}

interface Versiculo {
  id: number;
  numero: number;
  texto: string;
  id_capitulo: number;
}

interface Analisis {
  id: number;
  contexto_historico: string;
  resumen: string;
  temas_principales: string;
  conexiones: string;
  preguntas_reflexion: string;
  modelo_usado: string;
  created_at: string;
}

interface EstudioData {
  sesion: Sesion | null;
  versiculos: Versiculo[];
  analisis: Analisis | null;
}

function buildReferencia(sesion: Sesion): string {
  const ini = sesion.capituloInicio;
  const fin = sesion.capituloFin;
  const mismoLibro = ini.libro.nombre === fin.libro.nombre;
  const mismoCapitulo = ini.numero === fin.numero;

  if (mismoCapitulo) {
    return `${ini.libro.nombre} ${ini.numero}:${sesion.versiculoInicioNum}–${sesion.versiculoFinNum}`;
  }
  if (mismoLibro) {
    return `${ini.libro.nombre} ${ini.numero}:${sesion.versiculoInicioNum} – ${fin.numero}:${sesion.versiculoFinNum}`;
  }
  return `${ini.libro.nombre} ${ini.numero}:${sesion.versiculoInicioNum} – ${fin.libro.nombre} ${fin.numero}:${sesion.versiculoFinNum}`;
}

export default function EstudioPage() {
  const router = useRouter();
  const [data, setData] = useState<EstudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<EstudioData>("/api/estudio")
      .then((res) => setData(res.data))
      .catch(() => setError("No se pudo cargar el estudio"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCompletar() {
    if (!data?.sesion) return;
    setCompleting(true);
    try {
      await apiClient.post("/api/estudio/completar", { sesionId: data.sesion.id });
      router.push("/");
      router.refresh();
    } catch {
      setError("No se pudo marcar como completada");
      setCompleting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data?.sesion) return <SinSesion />;

  const { sesion, versiculos, analisis } = data;
  const referencia = buildReferencia(sesion);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {/* Encabezado */}
      <div className="mb-10">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">
          Día {sesion.orden} · Sesión de estudio
        </p>
        <h1 className="font-lora text-3xl text-[#2C2C2C] mb-1">{referencia}</h1>
        {sesion.fecha_programada && (
          <p className="font-inter text-sm text-[#8A8A8A]">
            {new Date(sesion.fecha_programada + "T00:00:00").toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        )}
      </div>

      {/* Texto bíblico */}
      <section className="mb-12">
        <div className="space-y-1">
          {versiculos.map((v) => (
            <p key={v.id} className="font-lora text-[1.05rem] leading-8 text-[#2C2C2C]">
              <span className="text-[#8A8A8A] text-xs align-super mr-1.5 font-inter">
                {v.numero}
              </span>
              {v.texto}
            </p>
          ))}
        </div>
      </section>

      {/* Análisis */}
      {analisis ? (
        <AnalisisSection analisis={analisis} />
      ) : (
        <SinAnalisis />
      )}

      {/* Acción: marcar completada */}
      {!sesion.completada && (
        <div className="mt-12 pt-8 border-t border-[#E8E4DF]">
          <button
            onClick={handleCompletar}
            disabled={completing}
            className="bg-[#4A6FA5] text-white font-inter text-sm font-medium px-6 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
          >
            {completing ? "Guardando..." : "Marcar sesión como completada"}
          </button>
        </div>
      )}

      {sesion.completada && (
        <div className="mt-12 pt-8 border-t border-[#E8E4DF]">
          <span className="font-inter text-sm text-[#8A8A8A]">✓ Sesión completada</span>
        </div>
      )}
    </main>
  );
}

/* ── Análisis ──────────────────────────────────────────── */

function AnalisisSection({ analisis }: { analisis: Analisis }) {
  const secciones = [
    { label: "Contexto histórico", contenido: analisis.contexto_historico },
    { label: "Resumen del pasaje", contenido: analisis.resumen },
    { label: "Temas principales", contenido: analisis.temas_principales },
    { label: "Conexiones bíblicas", contenido: analisis.conexiones },
    { label: "Preguntas para reflexión", contenido: analisis.preguntas_reflexion },
  ].filter((s) => s.contenido);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-lora text-xl text-[#2C2C2C]">Análisis</h2>
        <span className="font-inter text-xs text-[#8A8A8A] bg-[#FAF8F5] border border-[#E8E4DF] px-2 py-1 rounded-full">
          {analisis.modelo_usado}
        </span>
      </div>

      <div className="space-y-8">
        {secciones.map(({ label, contenido }) => (
          <div key={label}>
            <h3 className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-3">
              {label}
            </h3>
            <div className="font-inter text-sm text-[#2C2C2C] leading-7 whitespace-pre-line">
              {contenido}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SinAnalisis() {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-6 text-center">
      <p className="font-lora text-lg text-[#2C2C2C] mb-1">Sin análisis todavía</p>
      <p className="font-inter text-sm text-[#8A8A8A]">
        El agente generará el análisis cuando procese esta sesión.
      </p>
    </div>
  );
}

/* ── Estados ───────────────────────────────────────────── */

function SinSesion() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="border border-[#E8E4DF] rounded-xl p-8 text-center">
        <p className="font-lora text-xl text-[#2C2C2C] mb-2">No hay sesiones pendientes</p>
        <p className="font-inter text-sm text-[#8A8A8A]">
          Has completado todas las sesiones del plan activo, o aún no tienes un plan.
        </p>
      </div>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="h-3 w-24 bg-[#E8E4DF] rounded mb-3 animate-pulse" />
        <div className="h-8 w-64 bg-[#E8E4DF] rounded animate-pulse" />
      </div>
      <div className="space-y-2 mb-12">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-5 bg-[#E8E4DF] rounded animate-pulse" style={{ width: `${75 + Math.random() * 25}%` }} />
        ))}
      </div>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-3 w-28 bg-[#E8E4DF] rounded mb-3 animate-pulse" />
            <div className="h-16 bg-[#E8E4DF] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <p className="font-inter text-sm text-red-500">{msg}</p>
    </main>
  );
}
