"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axios";
import { useResaltados } from "@/hooks/useResaltados";
import { useComentarios, type Comentario } from "@/hooks/useComentarios";
import { useNotas, type Nota } from "@/hooks/useNotas";
import { FloatingVerseMenu, COLORES_RESALTADO } from "@/components/ui/FloatingVerseMenu";
import { ComentarioIcono, ComentarioOverlay } from "@/components/ui/ComentarioOverlay";
import { NotaIcono, NotaModal } from "@/components/ui/NotaModal";

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
  planNombre?: string;
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
  sinPlan?: boolean;
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
  const { cargar: cargarComentarios, comentarioPara } = useComentarios();
  const { cargar: cargarNotas, notaPara, guardar: guardarNota, eliminar: eliminarNota } = useNotas();
  const [comentarioAbierto, setComentarioAbierto] = useState<Comentario | null>(null);
  const [notaState, setNotaState] = useState<{
    versiculoId: number;
    versiculoNum: number;
    capituloNum: number;
    versiculoFinMax: number;
    notaExistente: Nota | null;
  } | null>(null);
  const [menuState, setMenuState] = useState<{
    versiculoId: number;
    versiculoNum: number;
    capituloNum: number;
    tieneNota: boolean;
    rect: DOMRect;
    copiar: () => void;
    compartir: () => void;
    comparar: () => void;
  } | null>(null);

  useEffect(() => {
    apiClient
      .get<EstudioData>("/api/estudio")
      .then((res) => {
        setData(res.data);
        cargar(res.data.versiculos.map((v) => v.id));
        if (res.data.sesion) {
          const abrev = res.data.sesion.capituloInicio.libro.abreviatura;
          const capIni = res.data.sesion.capituloInicio.numero;
          const capFin = res.data.sesion.capituloFin.numero;
          for (let c = capIni; c <= capFin; c++) {
            cargarComentarios(abrev, c);
            cargarNotas(abrev, c);
          }
        }
      })
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

  async function compartirVersiculo(texto: string, ref: string) {
    const sel = window.getSelection();
    const selText = sel && !sel.isCollapsed ? sel.toString().trim() : null;
    const textoCopia = selText ? `"${selText}" — ${ref}` : `${texto} — ${ref}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ text: textoCopia, title: ref }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(textoCopia); } catch {}
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

  async function copiarVersiculo(v: Versiculo, verseRef: string) {
    const sel = window.getSelection();
    const selText = sel && !sel.isCollapsed ? sel.toString().trim() : null;
    const textoCopia = selText ? `"${selText}" — ${verseRef}` : `${v.texto} — ${verseRef}`;
    try {
      await navigator.clipboard.writeText(textoCopia);
      setCopiado(v.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {}
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data?.sesion) return <SinSesion sinPlan={data?.sinPlan ?? false} />;

  const { sesion, versiculos, secciones, analisis } = data;
  const referencia = buildReferencia(sesion);

  const abrevEstudio = sesion.capituloInicio.libro.abreviatura;

  function makeMenuState(v: Versiculo, rect: DOMRect) {
    const libroNombre = sesion.capituloInicio.libro.nombre;
    const verseRef = `${libroNombre} ${v.capitulo_numero}:${v.numero}`;
    return {
      versiculoId: v.id,
      versiculoNum: v.numero,
      capituloNum: v.capitulo_numero,
      tieneNota: !!notaPara(abrevEstudio, v.capitulo_numero, v.numero),
      rect,
      copiar: () => copiarVersiculo(v, verseRef),
      compartir: () => compartirVersiculo(v.texto, verseRef),
      comparar: () => router.push(`/comparar?libro=${encodeURIComponent(libroNombre)}&capitulo=${v.capitulo_numero}&versiculo=${v.numero}`),
    };
  }

  function handleNota() {
    if (!menuState) return;
    const v = versiculos.find((x) => x.id === menuState.versiculoId);
    if (!v) return;
    const maxFin = Math.max(
      ...versiculos.filter((x) => x.capitulo_numero === v.capitulo_numero).map((x) => x.numero)
    );
    setNotaState({
      versiculoId: v.id,
      versiculoNum: v.numero,
      capituloNum: v.capitulo_numero,
      versiculoFinMax: maxFin,
      notaExistente: notaPara(abrevEstudio, v.capitulo_numero, v.numero),
    });
    setMenuState(null);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Encabezado */}
      <div className="mb-8 md:mb-10">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">
          {sesion.planNombre ? `${sesion.planNombre} · ` : ""}Día {sesion.orden}
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
            const abrev = sesion.capituloInicio.libro.abreviatura;
            const numerosAnteriores = versiculos.slice(0, i).filter(a => a.capitulo_numero === v.capitulo_numero).map(a => a.numero);
            const comentario = comentarioPara(abrev, v.capitulo_numero, v.numero, numerosAnteriores);
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
                  onMouseUp={() => {
                    const sel = window.getSelection();
                    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
                    const rect = sel.getRangeAt(0).getBoundingClientRect();
                    if (!rect.width && !rect.height) return;
                    setMenuState(makeMenuState(v, rect));
                  }}
                  onClick={(e) => {
                    const sel = window.getSelection();
                    if (sel && !sel.isCollapsed) return;
                    setMenuState(makeMenuState(v, (e.currentTarget as HTMLElement).getBoundingClientRect()));
                  }}
                  title="Toca para opciones · arrastra para resaltar"
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
                  {comentario && (
                    <ComentarioIcono comentario={comentario} onAbrir={setComentarioAbierto} />
                  )}
                  {(() => {
                    const nota = notaPara(abrevEstudio, v.capitulo_numero, v.numero);
                    return nota ? <NotaIcono nota={nota} onAbrir={(n) => {
                      const maxFin = Math.max(...versiculos.filter((x) => x.capitulo_numero === v.capitulo_numero).map((x) => x.numero));
                      setNotaState({ versiculoId: v.id, versiculoNum: v.numero, capituloNum: v.capitulo_numero, versiculoFinMax: maxFin, notaExistente: n });
                    }} /> : null;
                  })()}
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
        <FloatingVerseMenu
          versiculoId={menuState.versiculoId}
          rect={menuState.rect}
          resaltadoActual={resaltados[menuState.versiculoId]}
          tieneNota={menuState.tieneNota}
          onColor={(id, color) => { guardar(id, color); setMenuState(null); window.getSelection()?.removeAllRanges(); }}
          onQuitar={(id) => { quitar(id); setMenuState(null); window.getSelection()?.removeAllRanges(); }}
          onCopiar={() => { menuState.copiar(); setMenuState(null); window.getSelection()?.removeAllRanges(); }}
          onCompartir={() => { menuState.compartir(); setMenuState(null); window.getSelection()?.removeAllRanges(); }}
          onComparar={() => { menuState.comparar(); setMenuState(null); }}
          onNota={handleNota}
        />
      )}

      {notaState && (
        <NotaModal
          abreviatura_libro={abrevEstudio}
          capitulo={notaState.capituloNum}
          versiculoInicio={notaState.versiculoNum}
          versiculoFinMax={notaState.versiculoFinMax}
          notaExistente={notaState.notaExistente}
          libroNombre={sesion.capituloInicio.libro.nombre}
          onGuardar={async (datos) => {
            await guardarNota({
              abreviatura_libro: abrevEstudio,
              capitulo: notaState.capituloNum,
              versiculo_inicio: notaState.versiculoNum,
              ...datos,
            });
          }}
          onEliminar={notaState.notaExistente ? async () => {
            await eliminarNota(notaState.notaExistente!);
            setNotaState(null);
          } : undefined}
          onCerrar={() => setNotaState(null)}
        />
      )}

      {comentarioAbierto && (
        <ComentarioOverlay
          comentario={comentarioAbierto}
          referencia={`${sesion.capituloInicio.libro.nombre} ${comentarioAbierto.versiculo_inicio}${comentarioAbierto.versiculo_inicio !== comentarioAbierto.versiculo_fin ? `–${comentarioAbierto.versiculo_fin}` : ""}`}
          onCerrar={() => setComentarioAbierto(null)}
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

function SinSesion({ sinPlan }: { sinPlan: boolean }) {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="border border-[#E8E4DF] rounded-xl p-6 md:p-8 text-center">
        <p className="font-lora text-xl text-[#2C2C2C] mb-2">
          {sinPlan ? "No tienes un plan activo" : "Plan al día"}
        </p>
        <p className="font-inter text-sm text-[#8A8A8A] mb-5">
          {sinPlan
            ? "Activa un plan desde tu lista de planes para comenzar a estudiar."
            : "Has completado todas las sesiones pendientes del plan activo. ¡Buen trabajo!"}
        </p>
        <Link
          href="/plan"
          className="inline-block bg-[#4A6FA5] text-white font-inter text-sm px-5 py-2.5 rounded-lg hover:bg-[#3d5f8f] transition-colors"
        >
          {sinPlan ? "Ir a mis planes" : "Ver planes"}
        </Link>
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
