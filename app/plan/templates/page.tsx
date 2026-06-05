"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

/* ── Interfaces ───────────────────────────────────────────── */

interface SesionTemplate {
  id: number;
  orden: number;
  abreviatura_libro: string;
  capitulo_inicio: number;
  capitulo_fin: number;
}

interface Fase {
  id: number;
  numero: number;
  titulo: string;
  descripcion: string;
  color_acento: string;
  sesiones?: SesionTemplate[];
}

interface Template {
  id: number;
  titulo: string;
  descripcion: string;
  para_quien: string;
  nivel: "principiante" | "intermedio" | "avanzado" | "completo";
  es_completo: boolean;
  duracion_estimada_dias: number;
  icono: string;
  color_acento: string;
  recomendado: boolean;
  orden: number;
  fases: Fase[];
}

/* ── Constantes ───────────────────────────────────────────── */

const VERSIONES = [
  { valor: "RV1909",  label: "RV1909",  desc: "Reina-Valera 1909" },
  { valor: "RVR1960", label: "RVR1960", desc: "Reina-Valera 1960" },
  { valor: "NVI",     label: "NVI",     desc: "Nueva Versión Internacional" },
  { valor: "TLA",     label: "TLA",     desc: "Traducción en Lenguaje Actual" },
];

const GRUPOS = [
  { titulo: "Para comenzar",                  ordenes: [1, 2] },
  { titulo: "La vida y enseñanzas de Jesús",  ordenes: [3, 4, 5] },
  { titulo: "Recorrido completo",             ordenes: [6, 7] },
];

const ICONOS: Record<string, string> = {
  "ti-seedling": "🌱",
  "ti-sun":      "☀️",
  "ti-map-2":    "🗺️",
  "ti-book":     "📖",
  "ti-cross":    "✝️",
  "ti-heart":    "♥",
  "ti-timeline": "📋",
  "ti-route":    "🛤️",
  "ti-compass":  "🧭",
  "ti-star":     "⭐",
  "ti-bible":    "📖",
};

// Colores de acento como valores CSS — evita clases Tailwind dinámicas
const ACCENT: Record<string, string> = {
  info:      "#4A6FA5",
  warning:   "#D97706",
  success:   "#059669",
  danger:    "#E11D48",
  secondary: "#8A8A8A",
};

const NIVEL_LABEL: Record<string, string> = {
  principiante: "Principiante",
  intermedio:   "Intermedio",
  avanzado:     "Avanzado",
  completo:     "Completo",
};

function ac(acento: string): string {
  return ACCENT[acento] ?? ACCENT.secondary;
}

function icono(nombre: string): string {
  return ICONOS[nombre] ?? "📖";
}

type Vista = "lista" | "detalle";

/* ── Componente principal ─────────────────────────────────── */

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [vista, setVista] = useState<Vista>("lista");
  const [selected, setSelected] = useState<Template | null>(null);
  const [detalleFases, setDetalleFases] = useState<Fase[]>([]);
  const [librosMap, setLibrosMap] = useState<Record<string, string>>({});
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [version, setVersion] = useState("RVR1960");
  const [nombrePlan, setNombrePlan] = useState("");
  const [adoptando, setAdoptando] = useState(false);
  const [errorAdoptar, setErrorAdoptar] = useState("");

  useEffect(() => {
    apiClient
      .get<{ templates: Template[] }>("/api/plan/templates")
      .then((res) => setTemplates(res.data.templates))
      .finally(() => setLoading(false));
  }, []);

  async function verDetalle(t: Template) {
    setSelected(t);
    setVista("detalle");
    setLoadingDetalle(true);
    try {
      const res = await apiClient.get<{ fases: Fase[]; librosMap: Record<string, string> }>(
        `/api/plan/templates/${t.id}`
      );
      setDetalleFases(res.data.fases);
      setLibrosMap(res.data.librosMap ?? {});
    } finally {
      setLoadingDetalle(false);
    }
  }

  function abrirModal() {
    if (!selected) return;
    setNombrePlan(selected.titulo);
    setVersion("RVR1960");
    setErrorAdoptar("");
    setModalAbierto(true);
  }

  async function handleAdoptar() {
    if (!selected || !nombrePlan.trim()) return;
    setAdoptando(true);
    setErrorAdoptar("");
    try {
      await apiClient.post("/api/plan/adoptar", {
        id_template: selected.id,
        version_biblica: version,
        nombre_plan: nombrePlan.trim(),
      });
      router.push("/plan");
    } catch {
      setErrorAdoptar("No se pudo crear el plan. Inténtalo de nuevo.");
      setAdoptando(false);
    }
  }

  /* ── Render: lista ── */
  if (vista === "lista") {
    return (
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 md:mb-10">
          <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Caminos de lectura</h1>
          <p className="font-inter text-sm text-[#8A8A8A] mt-1">
            Planes de estudio bíblico diseñados para diferentes etapas del camino
          </p>
        </div>

        {loading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, g) => (
              <div key={g}>
                <div className="h-3 w-32 bg-[#E8E4DF] rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
                      <div className="h-5 w-48 bg-[#E8E4DF] rounded animate-pulse mb-2" />
                      <div className="h-4 w-full bg-[#E8E4DF] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-10">
            {GRUPOS.map((grupo) => {
              const items = templates.filter((t) => grupo.ordenes.includes(t.orden));
              if (!items.length) return null;
              return (
                <div key={grupo.titulo}>
                  <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-widest mb-4">
                    {grupo.titulo}
                  </p>
                  <div className="space-y-3">
                    {items.map((t) => (
                      <TemplateCard key={t.id} template={t} onClick={() => verDetalle(t)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  /* ── Render: detalle ── */
  if (!selected) return null;

  const color = ac(selected.color_acento);
  const totalSesiones = detalleFases.reduce((acc, f) => acc + (f.sesiones?.length ?? 0), 0);
  const librosUnicos = Array.from(new Set(
    detalleFases.flatMap((f) => (f.sesiones ?? []).map((s) => s.abreviatura_libro))
  ));

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Back */}
      <button
        onClick={() => { setVista("lista"); setSelected(null); setDetalleFases([]); setLibrosMap({}); }}
        className="font-inter text-sm text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors mb-6 flex items-center gap-1"
      >
        ← Volver a los planes
      </button>

      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-3">
          <span
            style={{ borderColor: color, backgroundColor: `${color}18` }}
            className="text-3xl shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border"
          >
            {icono(selected.icono)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">{selected.titulo}</h1>
              {selected.recomendado && (
                <span className="font-inter text-xs bg-[#4A6FA5] text-white px-2 py-0.5 rounded-full shrink-0">
                  Recomendado
                </span>
              )}
            </div>
            <p className="font-inter text-sm text-[#8A8A8A]">{selected.descripcion}</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Nivel",    valor: NIVEL_LABEL[selected.nivel] },
            { label: "Días",     valor: `~${selected.duracion_estimada_dias}` },
            { label: "Sesiones", valor: totalSesiones > 0 ? String(totalSesiones) : "—" },
            { label: "Libros",   valor: librosUnicos.length > 0 ? String(librosUnicos.length) : "—" },
          ].map(({ label, valor }) => (
            <div key={label} className="border border-[#E8E4DF] rounded-xl px-4 py-3 text-center">
              <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-0.5">{label}</p>
              <p className="font-lora text-lg text-[#2C2C2C]">{valor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Para quién */}
      {selected.para_quien && (
        <div className="mb-8 border border-[#E8E4DF] rounded-xl px-5 py-4">
          <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">Para quién es este camino</p>
          <p className="font-inter text-sm text-[#2C2C2C] leading-6">{selected.para_quien}</p>
        </div>
      )}

      {/* Fases */}
      <div className="mb-8">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-widest mb-4">Fases del plan</p>

        {loadingDetalle && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
                <div className="h-4 w-36 bg-[#E8E4DF] rounded animate-pulse mb-2" />
                <div className="h-3 w-full bg-[#E8E4DF] rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loadingDetalle && detalleFases.length > 0 && (
          <div className="space-y-3">
            {detalleFases.map((fase) => {
              const fc = ac(fase.color_acento);
              const libros = Array.from(new Set((fase.sesiones ?? []).map((s) => s.abreviatura_libro)));
              const sesCount = fase.sesiones?.length ?? 0;
              return (
                <div
                  key={fase.id}
                  style={{ borderLeftColor: fc }}
                  className="border border-[#E8E4DF] border-l-4 rounded-xl px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        style={{ color: fc }}
                        className="font-inter text-xs uppercase tracking-widest mb-1"
                      >
                        Fase {fase.numero}
                      </p>
                      <h3 className="font-lora text-base text-[#2C2C2C] mb-1">{fase.titulo}</h3>
                      {fase.descripcion && (
                        <p className="font-inter text-sm text-[#8A8A8A] leading-5">{fase.descripcion}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-inter text-xs text-[#8A8A8A]">{sesCount} sesiones</p>
                    </div>
                  </div>
                  {libros.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {libros.map((abrev) => (
                        <span
                          key={abrev}
                          style={{ backgroundColor: `${fc}18`, color: fc }}
                          className="font-inter text-xs px-2 py-0.5 rounded-full capitalize"
                        >
                          {librosMap[abrev] ?? abrev}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="pt-2">
        <button
          onClick={abrirModal}
          className="w-full sm:w-auto bg-[#4A6FA5] text-white font-inter text-sm font-medium px-8 py-3.5 rounded-lg hover:bg-[#3d5f8f] transition-colors"
        >
          Comenzar este camino
        </button>
      </div>

      {/* Modal de adopción */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/30" onClick={() => !adoptando && setModalAbierto(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
            <div>
              <h2 className="font-lora text-xl text-[#2C2C2C] mb-1">Crear mi plan</h2>
              <p className="font-inter text-sm text-[#8A8A8A]">
                Personaliza cómo se llamará y en qué versión leerás.
              </p>
            </div>

            <div>
              <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
                Nombre del plan
              </label>
              <input
                type="text"
                value={nombrePlan}
                onChange={(e) => setNombrePlan(e.target.value)}
                disabled={adoptando}
                maxLength={80}
                className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">
                Versión bíblica
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VERSIONES.map((v) => (
                  <button
                    key={v.valor}
                    type="button"
                    onClick={() => setVersion(v.valor)}
                    disabled={adoptando}
                    className={`border rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                      version === v.valor
                        ? "border-[#4A6FA5] bg-[#4A6FA5]/5"
                        : "border-[#E8E4DF] hover:border-[#4A6FA5]/40 bg-[#FAF8F5]"
                    }`}
                  >
                    <p className={`font-inter text-sm font-medium ${version === v.valor ? "text-[#4A6FA5]" : "text-[#2C2C2C]"}`}>
                      {v.label}
                    </p>
                    <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {errorAdoptar && (
              <p className="font-inter text-xs text-red-500">{errorAdoptar}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalAbierto(false)}
                disabled={adoptando}
                className="flex-1 border border-[#E8E4DF] font-inter text-sm text-[#8A8A8A] py-3 rounded-lg hover:bg-[#FAF8F5] transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdoptar}
                disabled={adoptando || !nombrePlan.trim()}
                className="flex-1 bg-[#4A6FA5] text-white font-inter text-sm font-medium py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {adoptando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : "Crear mi plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Card de template ─────────────────────────────────────── */

function TemplateCard({ template: t, onClick }: { template: Template; onClick: () => void }) {
  const color = ac(t.color_acento);
  return (
    <button
      onClick={onClick}
      style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
      className="w-full text-left border border-[#E8E4DF] rounded-xl px-5 py-4 hover:bg-[#F0EDE8] transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl shrink-0 mt-0.5">{icono(t.icono)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-lora text-lg text-[#2C2C2C]">{t.titulo}</h3>
              {t.recomendado && (
                <span className="font-inter text-xs bg-[#4A6FA5] text-white px-2 py-0.5 rounded-full shrink-0">
                  Recomendado
                </span>
              )}
            </div>
            <p className="font-inter text-sm text-[#8A8A8A] leading-5 line-clamp-2">{t.descripcion}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span
                style={{ backgroundColor: `${color}18`, color }}
                className="font-inter text-xs px-2 py-0.5 rounded-full"
              >
                {NIVEL_LABEL[t.nivel]}
              </span>
              <span className="font-inter text-xs px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#8A8A8A] border border-[#E8E4DF]">
                ~{t.duracion_estimada_dias} días
              </span>
              <span className="font-inter text-xs px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#8A8A8A] border border-[#E8E4DF]">
                {t.fases.length} fases
              </span>
            </div>
          </div>
        </div>
        <span className="font-inter text-sm text-[#4A6FA5] shrink-0 group-hover:text-[#3d5f8f] transition-colors mt-1">
          Ver →
        </span>
      </div>
    </button>
  );
}
