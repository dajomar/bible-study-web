"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axios";

interface CapituloInfo {
  numero: number;
  libro: { nombre: string };
}

interface SesionInfo {
  id: number;
  orden: number;
  plan: { nombre: string };
  inicio: { numero: number; capitulo: CapituloInfo };
  fin: { numero: number; capitulo: CapituloInfo };
}

interface Analisis {
  id: number;
  resumen: string;
  temas_principales: string;
  contexto_historico: string;
  conexiones: string;
  preguntas_reflexion: string;
  modelo_usado: string;
  created_at: string;
  sesion: SesionInfo;
}

interface Versiculo {
  id: number;
  numero: number;
  texto: string;
  id_capitulo: number;
}

function buildReferencia(sesion: SesionInfo): string {
  const ini = sesion.inicio;
  const fin = sesion.fin;
  const mismoLibro = ini.capitulo.libro.nombre === fin.capitulo.libro.nombre;
  const mismoCapitulo = ini.capitulo.numero === fin.capitulo.numero;

  if (mismoCapitulo) return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero}–${fin.numero}`;
  if (mismoLibro) return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero} – ${fin.capitulo.numero}:${fin.numero}`;
  return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero} – ${fin.capitulo.libro.nombre} ${fin.capitulo.numero}:${fin.numero}`;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AnalisisPage() {
  const [lista, setLista] = useState<Analisis[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [versiculosMap, setVersiculosMap] = useState<Record<number, Versiculo[]>>({});
  const [loadingVers, setLoadingVers] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get<{ analisis: Analisis[] }>("/api/analisis")
      .then((res) => setLista(res.data.analisis))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(analisis: Analisis) {
    const { id, sesion } = analisis;

    // Cerrar si ya está abierto
    if (abierto === id) {
      setAbierto(null);
      return;
    }

    setAbierto(id);

    // Cargar versículos solo si no los tenemos ya
    if (!versiculosMap[sesion.id]) {
      setLoadingVers(id);
      try {
        const res = await apiClient.get<{ versiculos: Versiculo[] }>(
          `/api/sesion/${sesion.id}/versiculos`
        );
        setVersiculosMap((prev) => ({ ...prev, [sesion.id]: res.data.versiculos }));
      } finally {
        setLoadingVers(null);
      }
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8 md:mb-10">
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Análisis</h1>
        <p className="font-inter text-sm text-[#8A8A8A] mt-1">
          Análisis generados por el agente para tus sesiones de estudio
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
              <div className="h-3 w-20 bg-[#E8E4DF] rounded mb-2 animate-pulse" />
              <div className="h-5 w-48 bg-[#E8E4DF] rounded mb-3 animate-pulse" />
              <div className="h-4 w-full bg-[#E8E4DF] rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && lista.length === 0 && (
        <div className="border border-[#E8E4DF] rounded-xl p-6 md:p-8 text-center">
          <p className="font-lora text-lg text-[#2C2C2C] mb-2">Sin análisis todavía</p>
          <p className="font-inter text-sm text-[#8A8A8A]">
            El agente generará análisis a medida que avances en tus sesiones de estudio.
          </p>
        </div>
      )}

      {!loading && lista.length > 0 && (
        <div className="space-y-4">
          {lista.map((a) => {
            const referencia = buildReferencia(a.sesion);
            const expandido = abierto === a.id;
            const versiculos = versiculosMap[a.sesion.id] ?? [];
            const cargandoVers = loadingVers === a.id;

            return (
              <div key={a.id} className="border border-[#E8E4DF] rounded-xl overflow-hidden">
                {/* Cabecera */}
                <button
                  onClick={() => toggle(a)}
                  className="w-full text-left px-4 md:px-6 py-5 hover:bg-[#FAF8F5] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">
                      {a.sesion.plan.nombre} · Día {a.sesion.orden}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-inter text-xs text-[#8A8A8A] hidden sm:inline">
                        {formatFecha(a.created_at)}
                      </span>
                      <span className={`font-inter text-xs text-[#4A6FA5] inline-block transition-transform ${expandido ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </div>
                  </div>
                  <p className="font-lora text-lg text-[#2C2C2C] mb-1">{referencia}</p>
                  <p className="font-inter text-xs text-[#8A8A8A] sm:hidden mb-2">
                    {formatFecha(a.created_at)}
                  </p>
                  {a.resumen && (
                    <p className="font-inter text-sm text-[#8A8A8A] line-clamp-2">{a.resumen}</p>
                  )}
                </button>

                {/* Contenido expandido */}
                {expandido && (
                  <div className="border-t border-[#E8E4DF]">
                    {/* Texto bíblico */}
                    <div className="px-4 md:px-6 py-6 border-b border-[#E8E4DF]">
                      <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-4">
                        Texto — {referencia}
                      </p>

                      {cargandoVers && (
                        <div className="space-y-2">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="h-4 bg-[#E8E4DF] rounded animate-pulse"
                              style={{ width: `${60 + (i * 11) % 40}%` }}
                            />
                          ))}
                        </div>
                      )}

                      {!cargandoVers && versiculos.length > 0 && (
                        <div className="space-y-0.5">
                          {versiculos.map((v) => (
                            <p
                              key={v.id}
                              className="font-lora text-base leading-8 text-[#2C2C2C]"
                            >
                              <span className="text-[#8A8A8A] text-xs align-super mr-1 font-inter">
                                {v.numero}
                              </span>
                              {v.texto}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Análisis */}
                    <div className="px-4 md:px-6 py-6">
                      <div className="flex items-center justify-between mb-6">
                        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">
                          Análisis
                        </p>
                        <span className="font-inter text-xs text-[#8A8A8A] bg-[#FAF8F5] border border-[#E8E4DF] px-2 py-1 rounded-full">
                          {a.modelo_usado}
                        </span>
                      </div>

                      <div className="space-y-7">
                        {[
                          { label: "Contexto histórico", texto: a.contexto_historico },
                          { label: "Resumen del pasaje", texto: a.resumen },
                          { label: "Temas principales", texto: a.temas_principales },
                          { label: "Conexiones bíblicas", texto: a.conexiones },
                          { label: "Preguntas para reflexión", texto: a.preguntas_reflexion },
                        ]
                          .filter((s) => s.texto)
                          .map(({ label, texto }) => (
                            <div key={label}>
                              <h3 className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-3">
                                {label}
                              </h3>
                              <p className="font-inter text-sm text-[#2C2C2C] leading-7 whitespace-pre-line">
                                {texto}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
