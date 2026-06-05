"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";
import { useResaltados } from "@/hooks/useResaltados";
import { FloatingHighlightMenu, COLORES_RESALTADO } from "@/components/ui/FloatingHighlightMenu";

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
  capitulo_numero: number;
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

interface Seccion {
  versiculo_inicio: number;
  titulo: string;
  capitulo: number;
}

interface EstudioData {
  sesion: Sesion | null;
  versiculos: Versiculo[];
  secciones: Seccion[];
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

const FONT_SIZES = [
  "text-sm leading-7",
  "text-base leading-8",
  "text-lg leading-9",
];

export default function EstudioPage() {
  const router = useRouter();
  const [data, setData] = useState<EstudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [tamano, setTamano] = useState(1);
  const [copiado, setCopiado] = useState<number | null>(null);
  const { resaltados, cargar, guardar, quitar } = useResaltados();
  const [menuState, setMenuState] = useState<{ versiculoId: number; rect: DOMRect } | null>(null);
  // Ref síncrono para evitar que onClick copie cuando mouseup detectó una selección
  const suppressCopyRef = useRef(false);

  useEffect(() => {
    apiClient
      .get<EstudioData>("/api/estudio")
      .then((res) => { setData(res.data); cargar(res.data.versiculos.map((v) => v.id)); })
      .catch(() => setError("No se pudo cargar el estudio"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cierra el menú con scroll o clic fuera
  useEffect(() => {
    const onScroll = () => setMenuState(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  useEffect(() => {
    if (!menuState) return;
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-highlight-menu]")) setMenuState(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [menuState]);

  // Llamado por onMouseUp de cada <p> de versículo
  function onVerseMouseUp(versiculoId: number) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    suppressCopyRef.current = true;   // mouseup siempre precede a click
    setMenuState({ versiculoId, rect });
  }

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

  async function copiarVersiculo(v: Versiculo, referencia: string) {
    const texto = `${v.texto} — ${referencia.split("–")[0].trim().split(" – ")[0]} ${v.numero > 1 ? "" : ""}`.trim();
    // Construir referencia precisa del versículo
    const ref = referencia;
    const textoCopia = `${v.texto} — ${ref.split(":")[0]}:${v.numero}`;
    try {
      await navigator.clipboard.writeText(textoCopia);
      setCopiado(v.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      // clipboard no disponible
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data?.sesion) return <SinSesion />;

  const { sesion, versiculos, secciones, analisis } = data;
  const referencia = buildReferencia(sesion);

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Encabezado */}
      <div className="mb-8 md:mb-10">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">
          Día {sesion.orden} · Sesión de estudio
        </p>
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C] mb-1">{referencia}</h1>
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
      <section className="mb-10 md:mb-12">
        {/* Cabecera de sección con controles */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E8E4DF]">
          <div>
            <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">Texto</p>
            {versiculos.length > 0 && (
              <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">{versiculos.length} versículos</p>
            )}
          </div>
          <div className="flex items-center gap-1 border border-[#E8E4DF] rounded-lg overflow-hidden">
            <button
              onClick={() => setTamano((t) => Math.max(0, t - 1))}
              disabled={tamano === 0}
              className="px-3 py-2 font-inter text-xs text-[#8A8A8A] hover:bg-[#F0EDE8] transition-colors disabled:opacity-30"
              title="Reducir texto"
            >
              A−
            </button>
            <div className="w-px h-5 bg-[#E8E4DF]" />
            <button
              onClick={() => setTamano((t) => Math.min(FONT_SIZES.length - 1, t + 1))}
              disabled={tamano === FONT_SIZES.length - 1}
              className="px-3 py-2 font-inter text-sm text-[#8A8A8A] hover:bg-[#F0EDE8] transition-colors disabled:opacity-30"
              title="Aumentar texto"
            >
              A+
            </button>
          </div>
        </div>

        <div className="space-y-0.5">
          {versiculos.map((v, i) => {
            const esNuevoCapitulo = i === 0 || v.id_capitulo !== versiculos[i - 1].id_capitulo;
            const seccion = secciones.find(
              (s) => s.capitulo === v.capitulo_numero && s.versiculo_inicio === v.numero
            );
            return (
              <div key={v.id}>
                {esNuevoCapitulo && (
                  <div className={`flex items-center gap-3 ${i === 0 ? "mb-4" : "mt-7 mb-4"}`}>
                    <div className="flex-1 h-px bg-[#E8E4DF]" />
                    <p className="font-lora text-sm text-[#4A6FA5] tracking-wide">
                      Capítulo {v.capitulo_numero}
                    </p>
                    <div className="flex-1 h-px bg-[#E8E4DF]" />
                  </div>
                )}
                {seccion && !esNuevoCapitulo && (
                  <p className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest mt-6 mb-2 px-2 -mx-2">
                    {seccion.titulo}
                  </p>
                )}
                {seccion && esNuevoCapitulo && (
                  <p className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest mb-2 px-2 -mx-2">
                    {seccion.titulo}
                  </p>
                )}
                <p
                  data-versiculo-id={v.id}
                  onMouseUp={() => onVerseMouseUp(v.id)}
                  onClick={() => {
                    if (suppressCopyRef.current) { suppressCopyRef.current = false; return; }
                    copiarVersiculo(v, referencia);
                  }}
                  title="Clic para copiar · arrastra para resaltar"
                  style={{
                    backgroundColor: copiado === v.id
                      ? undefined
                      : resaltados[v.id]
                        ? COLORES_RESALTADO[resaltados[v.id]].bg
                        : undefined,
                  }}
                  className={`font-lora ${FONT_SIZES[tamano]} text-[#2C2C2C] rounded-md px-2 -mx-2 cursor-pointer transition-colors ${
                    copiado === v.id
                      ? "bg-[#4A6FA5]/10 text-[#4A6FA5]"
                      : "hover:bg-[#F0EDE8]"
                  }`}
                >
                  <span className="text-[#8A8A8A] text-xs align-super mr-1.5 font-inter">{v.numero}</span>
                  {v.texto}
                  {copiado === v.id && (
                    <span className="ml-2 font-inter text-xs text-[#4A6FA5] not-italic">copiado</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Divisor */}
      <div className="flex items-center gap-4 mb-10 md:mb-12">
        <div className="flex-1 h-px bg-[#E8E4DF]" />
        <span className="font-inter text-xs text-[#8A8A8A] uppercase tracking-widest">Análisis</span>
        <div className="flex-1 h-px bg-[#E8E4DF]" />
      </div>

      {/* Análisis */}
      {analisis ? <AnalisisSection analisis={analisis} /> : <SinAnalisis />}

      {/* Marcar completada */}
      {!sesion.completada && (
        <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-[#E8E4DF]">
          <button
            onClick={handleCompletar}
            disabled={completing}
            className="w-full md:w-auto bg-[#4A6FA5] text-white font-inter text-sm font-medium px-6 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
          >
            {completing ? "Guardando..." : "Marcar sesión como completada"}
          </button>
        </div>
      )}

      {sesion.completada && (
        <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-[#E8E4DF]">
          <span className="font-inter text-sm text-[#4A6FA5]">✓ Sesión completada</span>
        </div>
      )}

      {menuState && (
        <FloatingHighlightMenu
          versiculoId={menuState.versiculoId}
          rect={menuState.rect}
          resaltadoActual={resaltados[menuState.versiculoId]}
          onColor={(id, color) => {
            guardar(id, color);
            setMenuState(null);
            window.getSelection()?.removeAllRanges();
          }}
          onQuitar={(id) => {
            quitar(id);
            setMenuState(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </main>
  );
}

function AnalisisSection({ analisis }: { analisis: Analisis }) {
  const secciones = [
    { label: "Contexto histórico", contenido: analisis.contexto_historico },
    { label: "Resumen del pasaje", contenido: analisis.resumen },
    { label: "Temas principales", contenido: analisis.temas_principales },
    { label: "Conexiones bíblicas", contenido: analisis.conexiones },
    { label: "Preguntas para reflexión", contenido: analisis.preguntas_reflexion },
  ].filter((s) => s.contenido);

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(
    Object.fromEntries(secciones.map((s) => [s.label, true]))
  );

  function toggle(label: string) {
    setAbiertos((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <span className="font-inter text-xs text-[#8A8A8A] bg-[#FAF8F5] border border-[#E8E4DF] px-2 py-1 rounded-full">
          {analisis.modelo_usado}
        </span>
        <button
          onClick={() => {
            const algunoAbierto = secciones.some((s) => abiertos[s.label]);
            setAbiertos(Object.fromEntries(secciones.map((s) => [s.label, !algunoAbierto])));
          }}
          className="font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors"
        >
          {secciones.some((s) => abiertos[s.label]) ? "Colapsar todo" : "Expandir todo"}
        </button>
      </div>

      <div className="space-y-2">
        {secciones.map(({ label, contenido }) => (
          <div key={label} className="border border-[#E8E4DF] rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(label)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAF8F5] transition-colors"
            >
              <h3 className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">{label}</h3>
              <span className={`font-inter text-xs text-[#8A8A8A] transition-transform ${abiertos[label] ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            {abiertos[label] && (
              <div className="px-5 pb-5 border-t border-[#E8E4DF]">
                <p className="font-inter text-sm text-[#2C2C2C] leading-7 whitespace-pre-line pt-4">
                  {contenido}
                </p>
              </div>
            )}
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

function SinSesion() {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="border border-[#E8E4DF] rounded-xl p-6 md:p-8 text-center">
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
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="h-3 w-24 bg-[#E8E4DF] rounded mb-3 animate-pulse" />
        <div className="h-8 w-64 bg-[#E8E4DF] rounded animate-pulse" />
      </div>
      <div className="space-y-2 mb-10">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-5 bg-[#E8E4DF] rounded animate-pulse" style={{ width: `${75 + (i * 7) % 25}%` }} />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
            <div className="h-3 w-28 bg-[#E8E4DF] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="font-inter text-sm text-red-500">{msg}</p>
    </main>
  );
}
