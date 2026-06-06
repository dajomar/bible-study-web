"use client";

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/axios";
import { useResaltados } from "@/hooks/useResaltados";
import { useComentarios, type Comentario } from "@/hooks/useComentarios";
import { useNotas, type Nota } from "@/hooks/useNotas";
import { FloatingVerseMenu, COLORES_RESALTADO } from "@/components/ui/FloatingVerseMenu";
import { ComentarioIcono, ComentarioOverlay } from "@/components/ui/ComentarioOverlay";
import { NotaIcono, NotaModal, COLORES_NOTA } from "@/components/ui/NotaModal";

interface Libro {
  id: number;
  orden: number;
  nombre: string;
  abreviatura: string;
  testamento: "Antiguo" | "Nuevo";
}

interface Capitulo {
  id: number;
  numero: number;
}

interface Versiculo {
  id: number;
  numero: number;
  texto: string;
}

interface Seccion {
  versiculo_inicio: number;
  titulo: string;
}

interface ResultadoComparar {
  version: string;
  libroNombre?: string;
  versiculos: Versiculo[];
  secciones: Seccion[];
  error?: string;
}

const FONT_SIZES = [
  { clase: "text-sm leading-7" },
  { clase: "text-base leading-8" },
  { clase: "text-lg leading-9" },
];

const VERSIONES = [
  { valor: "RV1909", label: "RV1909", desc: "Reina-Valera 1909" },
  { valor: "RVR1960", label: "RVR1960", desc: "Reina-Valera 1960" },
  { valor: "NVI", label: "NVI", desc: "Nueva Versión Internacional" },
  { valor: "TLA", label: "TLA", desc: "Traducción en Lenguaje Actual" },
];

/* ── Normalizar texto (sin tildes, minúsculas) ────────────── */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ── Highlight accent-insensitive ─────────────────────────── */
function highlightTexto(texto: string, termino: string) {
  const textoNorm = normalizar(texto);
  const terminoNorm = normalizar(termino);
  const partes: { texto: string; match: boolean }[] = [];
  let pos = 0;
  let idx = textoNorm.indexOf(terminoNorm, pos);
  while (idx !== -1) {
    if (idx > pos) partes.push({ texto: texto.slice(pos, idx), match: false });
    partes.push({ texto: texto.slice(idx, idx + termino.length), match: true });
    pos = idx + termino.length;
    idx = textoNorm.indexOf(terminoNorm, pos);
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos), match: false });
  return partes;
}

/* ── Parser de referencia (accent-insensitive) ────────────── */
function parsearReferencia(
  input: string,
  libros: Libro[]
): { libro: Libro; capitulo: number; versiculo?: number } | null {
  const texto = input.trim();
  if (!texto) return null;

  const textoNorm = normalizar(texto);
  // Ordenar de mayor a menor longitud de nombre para evitar matches parciales
  const ordenados = [...libros].sort((a, b) => b.nombre.length - a.nombre.length);

  for (const libro of ordenados) {
    // Probar nombre y abreviatura normalizados
    const candidatos = [
      { norm: normalizar(libro.nombre), len: libro.nombre.length },
      { norm: normalizar(libro.abreviatura), len: libro.abreviatura.length },
    ];
    for (const { norm, len } of candidatos) {
      if (textoNorm.startsWith(norm)) {
        // Slicear el texto original por la longitud del candidato
        // (normalizar preserva la longitud de los caracteres base)
        const resto = texto.slice(len).trim();
        const match = resto.match(/^(\d+)(?::(\d+))?/);
        if (match) {
          return {
            libro,
            capitulo: parseInt(match[1]),
            versiculo: match[2] ? parseInt(match[2]) : undefined,
          };
        }
      }
    }
  }
  return null;
}

/* ── Sugerencias de libro para un input ───────────────────── */
function getSugerencias(input: string, libros: Libro[], limit = 6): Libro[] {
  const q = input.trim();
  if (!q || /\s+\d/.test(q)) return []; // Ya tiene capítulo → ocultar
  const qNorm = normalizar(q);
  return libros
    .filter(
      (l) =>
        normalizar(l.nombre).startsWith(qNorm) ||
        normalizar(l.abreviatura).startsWith(qNorm) ||
        normalizar(l.nombre).includes(qNorm)
    )
    .slice(0, limit);
}

/* ── Componente principal ─────────────────────────────────── */

type Modo = "referencia" | "busqueda" | "comparar";

export default function BibliaPage() {
  return (
    <Suspense>
      <BibliaContent />
    </Suspense>
  );
}

function BibliaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Estado del lector (compartido entre referencia y busqueda) ──
  const [libros, setLibros] = useState<Libro[]>([]);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [libroId, setLibroId] = useState<string>("");
  const [capituloNum, setCapituloNum] = useState<string>("");

  const [loadingLibros, setLoadingLibros] = useState(true);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [loadingVers, setLoadingVers] = useState(false);

  const [versionLectura, setVersionLectura] = useState<string>("");
  const [cambiandoVersion, setCambiandoVersion] = useState(false);

  const [tamano, setTamano] = useState(1);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [modo, setModo] = useState<Modo>("referencia");
  const { resaltados, cargar, guardar, quitar } = useResaltados();
  const { cargar: cargarComentarios, comentarioPara } = useComentarios();
  const { cargar: cargarNotas, notaPara, notaEnRango, notasDeCapitulo, guardar: guardarNota, eliminar: eliminarNota } = useNotas();
  const [comentarioAbierto, setComentarioAbierto] = useState<Comentario | null>(null);
  const [notaState, setNotaState] = useState<{
    versiculoNum: number;
    versiculoFinMax: number;
    notaExistente: Nota | null;
  } | null>(null);
  const [menuState, setMenuState] = useState<{
    versiculoId: number;
    versiculoNum: number;
    tieneNota: boolean;
    rect: DOMRect;
    copiar: () => void;
    compartir: () => void;
    comparar: () => void;
  } | null>(null);

  // ── Estado: modo referencia ──
  const [inputRef, setInputRef] = useState("");
  const [errorRef, setErrorRef] = useState("");
  const [explorarAbierto, setExplorarAbierto] = useState(false);

  // ── Estado: modo busqueda (libros) ──
  const [inputLibro, setInputLibro] = useState("");

  // ── Estado: versículo destacado ──
  const [versiculoDestacado, setVersiculoDestacado] = useState<number | null>(null);
  const versiculoRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const textColRef = useRef<HTMLDivElement>(null);
  const [notaPositions, setNotaPositions] = useState<Map<number, number>>(new Map());

  // ── Estado: comparar ──
  const [refComparar, setRefComparar] = useState("");
  const [errorComparar, setErrorComparar] = useState("");
  const [versionesComparar, setVersionesComparar] = useState<string[]>(["RVR1960", "NVI"]);
  const [resultadosComparar, setResultadosComparar] = useState<ResultadoComparar[]>([]);
  const [loadingComparar, setLoadingComparar] = useState(false);

  // ── Sugerencias de libros ──
  const sugerenciasRef = useMemo(() => getSugerencias(inputRef, libros), [inputRef, libros]);
  const sugerenciasLibro = useMemo(() => getSugerencias(inputLibro, libros, 8), [inputLibro, libros]);
  const sugerenciasComparar = useMemo(() => getSugerencias(refComparar, libros), [refComparar, libros]);

  // ── Leer ?modo=comparar&ref=... al montar ──
  useEffect(() => {
    const modoParam = searchParams.get("modo");
    const refParam = searchParams.get("ref");
    if (modoParam === "comparar" && refParam) {
      setModo("comparar");
      setRefComparar(refParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cargar libros al montar ──
  useEffect(() => {
    apiClient
      .get<{ libros: Libro[]; version: string }>("/api/biblia/libros")
      .then((res) => {
        setLibros(res.data.libros);
        setVersionLectura(res.data.version);
      })
      .finally(() => setLoadingLibros(false));
  }, []);

  // ── Scroll al versículo destacado ──
  useEffect(() => {
    if (!versiculoDestacado || versiculos.length === 0) return;
    const el = versiculoRefs.current[versiculoDestacado];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      setTimeout(() => setVersiculoDestacado(null), 2500);
    }
  }, [versiculos, versiculoDestacado]);

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

  function makeMenuState(v: Versiculo, rect: DOMRect) {
    const libro = libros.find((l) => String(l.id) === libroId);
    const verseRef = libro ? `${libro.nombre} ${capituloNum}:${v.numero}` : String(v.numero);
    const abrev = libro?.abreviatura ?? "";
    return {
      versiculoId: v.id,
      versiculoNum: v.numero,
      tieneNota: !!notaPara(abrev, Number(capituloNum), v.numero),
      rect,
      copiar: () => copiarVersiculo(v),
      compartir: () => compartirVersiculo(v.texto, verseRef),
      comparar: () => router.push(`/comparar?libro=${encodeURIComponent(libro ? libro.nombre : "")}&capitulo=${capituloNum}&versiculo=${v.numero}`),
    };
  }

  function handleNota() {
    if (!menuState || !libroSeleccionado) return;
    const maxFin = Math.max(...versiculos.map((v) => v.numero), menuState.versiculoNum);
    setNotaState({
      versiculoNum: menuState.versiculoNum,
      versiculoFinMax: maxFin,
      notaExistente: notaPara(libroSeleccionado.abreviatura, Number(capituloNum), menuState.versiculoNum),
    });
    setMenuState(null);
  }

  // ── Cargar versículos ──
  const cargarVersiculos = useCallback(async (libroIdVal: string, capNum: string, ver?: string) => {
    if (!libroIdVal || !capNum) return;
    setLoadingVers(true);
    setVersiculos([]);
    setSecciones([]);
    try {
      const v = ver ?? versionLectura;
      const res = await apiClient.get<{ versiculos: Versiculo[]; secciones: Seccion[] }>(
        `/api/biblia?libro_id=${libroIdVal}&capitulo=${capNum}${v ? `&version=${v}` : ""}`
      );
      setVersiculos(res.data.versiculos);
      setSecciones(res.data.secciones ?? []);
      cargar(res.data.versiculos.map((v: Versiculo) => v.id));
      // Cargar comentarios y notas del capítulo
      const libro = libros.find((l) => String(l.id) === libroIdVal);
      if (libro) {
        cargarComentarios(libro.abreviatura, Number(capNum));
        cargarNotas(libro.abreviatura, Number(capNum));
      }
    } finally {
      setLoadingVers(false);
    }
  }, [versionLectura, libros, cargarComentarios, cargarNotas]);

  // ── Cambiar versión del lector (solo local) ──
  async function cambiarVersionLectura(nueva: string) {
    if (nueva === versionLectura || cambiandoVersion) return;

    const refActiva = libroSeleccionado && capituloNum
      ? { libroNombre: libroSeleccionado.nombre, capituloNum }
      : null;

    setCambiandoVersion(true);
    setVersionLectura(nueva);
    setVersiculos([]);
    setSecciones([]);
    setCapitulos([]);

    try {
      const res = await apiClient.get<{ libros: Libro[]; version: string }>(
        `/api/biblia/libros?version=${nueva}`
      );
      const nuevosLibros = res.data.libros;
      setLibros(nuevosLibros);

      if (refActiva) {
        const nuevoLibro = nuevosLibros.find((l) => l.nombre === refActiva.libroNombre);
        if (nuevoLibro) {
          setLibroId(String(nuevoLibro.id));
          setCapituloNum(refActiva.capituloNum);
          const capRes = await apiClient.get<{ capitulos: Capitulo[] }>(
            `/api/biblia?libro_id=${nuevoLibro.id}&version=${nueva}`
          );
          setCapitulos(capRes.data.capitulos);
          await cargarVersiculos(String(nuevoLibro.id), refActiva.capituloNum, nueva);
        } else {
          setLibroId("");
          setCapituloNum("");
        }
      } else {
        setLibroId("");
        setCapituloNum("");
      }
    } finally {
      setCambiandoVersion(false);
    }
  }

  const handleLibroChange = useCallback(async (id: string) => {
    setLibroId(id);
    setCapituloNum("");
    setVersiculos([]);
    setVersiculoDestacado(null);
    if (!id) return;
    setLoadingCaps(true);
    try {
      const res = await apiClient.get<{ capitulos: Capitulo[] }>(
        `/api/biblia?libro_id=${id}${versionLectura ? `&version=${versionLectura}` : ""}`
      );
      setCapitulos(res.data.capitulos);
    } finally {
      setLoadingCaps(false);
    }
  }, [versionLectura]);

  const handleCapituloChange = useCallback(async (num: string) => {
    setCapituloNum(num);
    setVersiculoDestacado(null);
    await cargarVersiculos(libroId, num);
  }, [libroId, cargarVersiculos]);

  function navCapitulo(delta: number) {
    const actual = Number(capituloNum);
    const siguiente = actual + delta;
    if (siguiente < 1 || siguiente > capitulos.length) return;
    const num = String(siguiente);
    setCapituloNum(num);
    setVersiculoDestacado(null);
    cargarVersiculos(libroId, num);
  }

  // ── Ir a referencia (submit) ──
  async function handleBuscarReferencia(e: React.FormEvent) {
    e.preventDefault();
    setErrorRef("");
    if (!inputRef.trim()) return;

    const resultado = parsearReferencia(inputRef, libros);
    if (!resultado) {
      setErrorRef("No se reconoció la referencia. Prueba con «Juan 3:16», «Gén 1» o «Génesis 1:10».");
      return;
    }

    const { libro, capitulo, versiculo } = resultado;

    let caps = capitulos;
    if (String(libro.id) !== libroId) {
      setLoadingCaps(true);
      try {
        const res = await apiClient.get<{ capitulos: Capitulo[] }>(
          `/api/biblia?libro_id=${libro.id}${versionLectura ? `&version=${versionLectura}` : ""}`
        );
        caps = res.data.capitulos;
        setCapitulos(caps);
      } finally {
        setLoadingCaps(false);
      }
    }

    if (capitulo < 1 || capitulo > caps.length) {
      setErrorRef(`${libro.nombre} solo tiene ${caps.length} capítulos.`);
      return;
    }

    setLibroId(String(libro.id));
    setCapituloNum(String(capitulo));
    if (versiculo) setVersiculoDestacado(versiculo);
    await cargarVersiculos(String(libro.id), String(capitulo));
    setExplorarAbierto(false);
  }

  // ── Seleccionar libro desde autocompletado (sin cambiar tab) ──
  async function irALibro(libro: Libro) {
    setInputLibro("");
    setLibroId(String(libro.id));
    setCapituloNum("1");
    setVersiculoDestacado(null);
    setLoadingCaps(true);
    try {
      const capRes = await apiClient.get<{ capitulos: Capitulo[] }>(
        `/api/biblia?libro_id=${libro.id}${versionLectura ? `&version=${versionLectura}` : ""}`
      );
      setCapitulos(capRes.data.capitulos);
    } finally {
      setLoadingCaps(false);
    }
    await cargarVersiculos(String(libro.id), "1");
  }

  // ── Autocompletar libro en input de referencia ──
  function seleccionarSugerenciaRef(libro: Libro) {
    setInputRef(libro.nombre + " ");
    setErrorRef("");
    // Focus el input para que sigan escribiendo el capítulo
  }

  function seleccionarSugerenciaComparar(libro: Libro) {
    setRefComparar(libro.nombre + " ");
  }

  async function copiarVersiculo(v: Versiculo) {
    const libro = libros.find((l) => String(l.id) === libroId);
    const textoCopia = libro
      ? `${v.texto} — ${libro.nombre} ${capituloNum}:${v.numero}`
      : v.texto;
    try {
      await navigator.clipboard.writeText(textoCopia);
      setCopiado(v.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch { /* clipboard no disponible */ }
  }

  // ── Comparar ──
  async function handleComparar(e: React.FormEvent) {
    e.preventDefault();
    setErrorComparar("");
    if (!refComparar.trim()) return;
    if (versionesComparar.length < 2) {
      setErrorComparar("Selecciona al menos 2 versiones para comparar.");
      return;
    }

    const resultado = parsearReferencia(refComparar, libros);
    if (!resultado) {
      setErrorComparar("No se reconoció la referencia. Prueba con «Juan 3» o «Gén 1».");
      return;
    }

    setLoadingComparar(true);
    setResultadosComparar([]);
    try {
      const { libro, capitulo } = resultado;
      const res = await apiClient.get<{ resultados: ResultadoComparar[] }>(
        `/api/biblia/comparar?libro=${encodeURIComponent(libro.nombre)}&capitulo=${capitulo}&versiones=${versionesComparar.join(",")}`
      );
      setResultadosComparar(res.data.resultados);
    } catch {
      setErrorComparar("No se pudo cargar la comparación.");
    } finally {
      setLoadingComparar(false);
    }
  }

  function toggleVersionComparar(v: string) {
    setVersionesComparar((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  const libroSeleccionado = libros.find((l) => String(l.id) === libroId);
  const antiguoTestamento = libros.filter((l) => l.testamento === "Antiguo");
  const nuevoTestamento = libros.filter((l) => l.testamento === "Nuevo");
  const capActual = Number(capituloNum);
  const hayAnterior = capActual > 1;
  const haySiguiente = capActual > 0 && capActual < capitulos.length;

  // ── Notas del capítulo actual (para el panel lateral) ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const notasActuales = useMemo(() => {
    if (!libroSeleccionado || !capituloNum) return [];
    return notasDeCapitulo(libroSeleccionado.abreviatura, Number(capituloNum));
  }, [libroSeleccionado, capituloNum, notasDeCapitulo]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!notasActuales.length || !versiculos.length) {
      setNotaPositions(new Map());
      return;
    }
    const id = requestAnimationFrame(() => {
      let minBottom = 0;
      const pos = new Map<number, number>();
      for (const n of [...notasActuales].sort((a, b) => a.versiculo_inicio - b.versiculo_inicio)) {
        const el = versiculoRefs.current[n.versiculo_inicio];
        if (!el) continue;
        const top = Math.max(el.offsetTop, minBottom);
        pos.set(n.id, top);
        minBottom = top + 82 + 8;
      }
      setNotaPositions(pos);
    });
    return () => cancelAnimationFrame(id);
  }, [versiculos, notasActuales]);

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* ── Encabezado + pills de versión ── */}
      <div className="mb-8 md:mb-10">
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Biblia</h1>
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {VERSIONES.map((v) => {
            const activa = versionLectura === v.valor;
            return (
              <button
                key={v.valor}
                onClick={() => cambiarVersionLectura(v.valor)}
                disabled={cambiandoVersion || loadingLibros}
                title={v.desc}
                className={`shrink-0 font-inter text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                  activa
                    ? "bg-[#4A6FA5] text-white border-[#4A6FA5]"
                    : "text-[#8A8A8A] border-[#E8E4DF] hover:border-[#4A6FA5]/50 hover:text-[#4A6FA5] bg-[#FAF8F5]"
                }`}
              >
                {v.label}
              </button>
            );
          })}
          {cambiandoVersion && (
            <span className="font-inter text-xs text-[#8A8A8A] shrink-0 ml-1">Cargando...</span>
          )}
        </div>
        <p className="font-inter text-xs text-[#8A8A8A] mt-1.5">
          La versión seleccionada aplica solo al lector · no cambia tu configuración
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border border-[#E8E4DF] rounded-lg p-1 w-fit overflow-x-auto scrollbar-none">
        {(["referencia", "busqueda", "comparar"] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`shrink-0 font-inter text-xs px-4 py-2 rounded-md transition-colors ${
              modo === m ? "bg-[#4A6FA5] text-white" : "text-[#8A8A8A] hover:text-[#2C2C2C]"
            }`}
          >
            {m === "referencia" ? "Ir a referencia" : m === "busqueda" ? "Buscar libro" : "Comparar"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── Modo: Ir a referencia ─────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modo === "referencia" && (
        <>
          <form onSubmit={handleBuscarReferencia} className="mb-3">
            <div className="flex gap-2">
              {/* Input con autocomplete de libros */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputRef}
                  onChange={(e) => { setInputRef(e.target.value); setErrorRef(""); }}
                  placeholder="Juan 3:16 · Gén 1 · Génesis 1:10"
                  disabled={loadingLibros}
                  autoComplete="off"
                  className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors placeholder:text-[#C0BAB3] disabled:opacity-50"
                />
                {sugerenciasRef.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border border-[#E8E4DF] rounded-lg bg-white z-20 overflow-hidden shadow-sm">
                    {sugerenciasRef.map((libro) => (
                      <button
                        key={libro.id}
                        type="button"
                        onClick={() => seleccionarSugerenciaRef(libro)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#FAF8F5] transition-colors border-b border-[#E8E4DF] last:border-0 flex items-center justify-between"
                      >
                        <span className="font-lora text-sm text-[#2C2C2C]">{libro.nombre}</span>
                        <span className="font-inter text-xs text-[#8A8A8A]">{libro.abreviatura}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loadingLibros || !inputRef.trim()}
                className="bg-[#4A6FA5] text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-40 shrink-0"
              >
                Ir
              </button>
            </div>
            {errorRef && <p className="font-inter text-xs text-red-400 mt-2">{errorRef}</p>}
          </form>

          {/* Explorar por libro (colapsable) */}
          <div className="mb-6">
            <button
              onClick={() => setExplorarAbierto((v) => !v)}
              disabled={loadingLibros}
              className="flex items-center gap-1.5 font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors disabled:opacity-40"
            >
              <span className={`transition-transform inline-block ${explorarAbierto ? "rotate-90" : ""}`}>▶</span>
              Explorar por libro y capítulo
            </button>

            {explorarAbierto && (
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                <div className="flex-1">
                  <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">Libro</label>
                  <select
                    value={libroId}
                    onChange={(e) => handleLibroChange(e.target.value)}
                    className="w-full border border-[#E8E4DF] rounded-lg px-3 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
                  >
                    <option value="">Seleccionar libro...</option>
                    <optgroup label="Antiguo Testamento">
                      {antiguoTestamento.map((l) => (
                        <option key={l.id} value={l.id}>{l.nombre}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Nuevo Testamento">
                      {nuevoTestamento.map((l) => (
                        <option key={l.id} value={l.id}>{l.nombre}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="sm:w-36">
                  <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">Capítulo</label>
                  {loadingCaps ? (
                    <div className="h-11 bg-[#E8E4DF] rounded-lg animate-pulse" />
                  ) : (
                    <select
                      value={capituloNum}
                      onChange={(e) => handleCapituloChange(e.target.value)}
                      disabled={!libroId || capitulos.length === 0}
                      className="w-full border border-[#E8E4DF] rounded-lg px-3 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors disabled:opacity-40"
                    >
                      <option value="">—</option>
                      {capitulos.map((c) => (
                        <option key={c.id} value={c.numero}>{c.numero}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {!loadingVers && !libroId && !loadingLibros && versiculos.length === 0 && (
            <p className="font-inter text-sm text-[#8A8A8A]">
              Escribe una referencia o explora por libro para comenzar.
            </p>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── Modo: Buscar libro ────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modo === "busqueda" && (
        <>
          <div className="mb-2 relative">
            <input
              type="text"
              value={inputLibro}
              onChange={(e) => setInputLibro(e.target.value)}
              placeholder="Juan · Gén · Salmos · 1 Corintios..."
              autoFocus
              disabled={loadingLibros}
              autoComplete="off"
              className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors placeholder:text-[#C0BAB3] disabled:opacity-50"
            />
            {sugerenciasLibro.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 border border-[#E8E4DF] rounded-lg bg-white z-20 overflow-hidden shadow-sm">
                {sugerenciasLibro.map((libro) => {
                  const partes = highlightTexto(libro.nombre, inputLibro.trim());
                  return (
                    <button
                      key={libro.id}
                      type="button"
                      onClick={() => irALibro(libro)}
                      className="w-full text-left px-4 py-3 hover:bg-[#FAF8F5] transition-colors border-b border-[#E8E4DF] last:border-0 flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-lora text-sm text-[#2C2C2C]">
                          {partes.map((p, i) =>
                            p.match ? (
                              <mark key={i} className="bg-[#4A6FA5]/15 text-[#2C2C2C] rounded px-0.5 not-italic">
                                {p.texto}
                              </mark>
                            ) : (
                              <span key={i}>{p.texto}</span>
                            )
                          )}
                        </p>
                        <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">
                          {libro.testamento === "Antiguo" ? "Antiguo Testamento" : "Nuevo Testamento"}
                          {" · "}{libro.abreviatura}
                        </p>
                      </div>
                      <span className="font-inter text-xs text-[#4A6FA5] group-hover:text-[#3d5f8f] shrink-0 ml-3">Ir →</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {inputLibro.trim() && sugerenciasLibro.length === 0 && !loadingLibros && (
            <p className="font-inter text-sm text-[#8A8A8A] mt-3">
              No se encontró ningún libro con ese nombre.
            </p>
          )}
          {!inputLibro.trim() && !loadingLibros && versiculos.length === 0 && (
            <p className="font-inter text-sm text-[#8A8A8A] mt-3">
              Empieza a escribir el nombre de un libro para buscarlo.
            </p>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── Lector compartido (referencia + busqueda) ─────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modo !== "comparar" && (
        <>
          {/* Encabezado del pasaje con control de tamaño */}
          {libroSeleccionado && capituloNum && (
            <div className="flex items-center justify-between mt-6 mb-5 pb-4 border-b border-[#E8E4DF]">
              <div>
                <h2 className="font-lora text-xl text-[#2C2C2C]">
                  {libroSeleccionado.nombre} {capituloNum}
                </h2>
                {versiculos.length > 0 && (
                  <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">{versiculos.length} versículos</p>
                )}
              </div>
              <div className="flex items-center gap-1 border border-[#E8E4DF] rounded-lg overflow-hidden">
                <button onClick={() => setTamano((t) => Math.max(0, t - 1))} disabled={tamano === 0}
                  className="px-3 py-2 font-inter text-xs text-[#8A8A8A] hover:bg-[#F0EDE8] transition-colors disabled:opacity-30">A−</button>
                <div className="w-px h-5 bg-[#E8E4DF]" />
                <button onClick={() => setTamano((t) => Math.min(FONT_SIZES.length - 1, t + 1))} disabled={tamano === FONT_SIZES.length - 1}
                  className="px-3 py-2 font-inter text-sm text-[#8A8A8A] hover:bg-[#F0EDE8] transition-colors disabled:opacity-30">A+</button>
              </div>
            </div>
          )}

          {/* Skeleton */}
          {loadingVers && (
            <div className="mt-6 space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-5 bg-[#E8E4DF] rounded animate-pulse" style={{ width: `${65 + (i * 9) % 35}%` }} />
              ))}
            </div>
          )}

          {/* ── Layout dos columnas: texto + panel de notas ── */}
          <div className={notasActuales.length > 0 ? "xl:flex xl:gap-6 xl:w-[calc(100%+240px)]" : ""}>

            {/* Columna de texto */}
            <div ref={textColRef} className="relative flex-1 min-w-0">

              {/* Versículos */}
              {!loadingVers && versiculos.length > 0 && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-[#E8E4DF]" />
                    <p className="font-lora text-sm text-[#4A6FA5] tracking-wide">Capítulo {capituloNum}</p>
                    <div className="flex-1 h-px bg-[#E8E4DF]" />
                  </div>
                  {versiculos.map((v, i) => {
                    const destacado = versiculoDestacado === v.numero;
                    const seccion = secciones.find((s) => s.versiculo_inicio === v.numero);
                    const numerosAnteriores = versiculos.slice(0, i).map((a) => a.numero);
                    const comentario = libroSeleccionado
                      ? comentarioPara(libroSeleccionado.abreviatura, Number(capituloNum), v.numero, numerosAnteriores)
                      : null;
                    return (
                      <div key={v.id}>
                        {seccion && (
                          <p className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest mt-6 mb-2 px-2 -mx-2">
                            {seccion.titulo}
                          </p>
                        )}
                        <p
                          data-versiculo-id={v.id}
                          ref={(el) => { versiculoRefs.current[v.numero] = el; }}
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
                          title="Clic para copiar · selecciona texto para resaltar"
                          style={{
                            backgroundColor: copiado === v.id || destacado
                              ? undefined
                              : (() => {
                                  const abrev = libroSeleccionado?.abreviatura ?? "";
                                  const n = notaEnRango(abrev, Number(capituloNum), v.numero);
                                  if (n) return COLORES_NOTA[n.color]?.bg;
                                  return resaltados[v.id] ? COLORES_RESALTADO[resaltados[v.id]].bg : undefined;
                                })(),
                          }}
                          className={`font-lora ${FONT_SIZES[tamano].clase} rounded-md px-2 -mx-2 cursor-pointer transition-colors duration-500 ${
                            copiado === v.id ? "bg-[#4A6FA5]/10 text-[#4A6FA5]"
                              : destacado ? "bg-[#4A6FA5]/15 text-[#2C2C2C]"
                              : "text-[#2C2C2C] hover:bg-[#F0EDE8]"
                          }`}
                        >
                          <span className="text-[#8A8A8A] text-xs align-super mr-1.5 font-inter">{v.numero}</span>
                          {v.texto}
                          {comentario && (
                            <ComentarioIcono comentario={comentario} onAbrir={setComentarioAbierto} />
                          )}
                          {libroSeleccionado && (() => {
                            const nota = notaPara(libroSeleccionado.abreviatura, Number(capituloNum), v.numero);
                            return nota ? <NotaIcono nota={nota} onAbrir={(n) => {
                              const maxFin = Math.max(...versiculos.map((x) => x.numero), v.numero);
                              setNotaState({ versiculoNum: v.numero, versiculoFinMax: maxFin, notaExistente: n });
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
              )}

              {/* Navegación prev/next */}
              {capituloNum && !loadingVers && (
                <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#E8E4DF]">
                  <button onClick={() => navCapitulo(-1)} disabled={!hayAnterior}
                    className="font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    ← {hayAnterior ? `${libroSeleccionado?.nombre} ${capActual - 1}` : ""}
                  </button>
                  <button onClick={() => navCapitulo(1)} disabled={!haySiguiente}
                    className="font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    {haySiguiente ? `${libroSeleccionado?.nombre} ${capActual + 1}` : ""} →
                  </button>
                </div>
              )}

            </div>{/* fin columna texto */}

            {/* ── Panel lateral de notas (solo xl+, solo cuando hay notas) ── */}
            {notasActuales.length > 0 && (
              <div className="hidden xl:block w-56 shrink-0 relative">
                {notasActuales.map((nota) => {
                  const top = notaPositions.get(nota.id);
                  if (top === undefined) return null;
                  const colores = COLORES_NOTA[nota.color] ?? COLORES_NOTA.amarillo;
                  const rango = nota.versiculo_fin > nota.versiculo_inicio
                    ? `${nota.capitulo}:${nota.versiculo_inicio}–${nota.versiculo_fin}`
                    : `${nota.capitulo}:${nota.versiculo_inicio}`;
                  return (
                    <div
                      key={nota.id}
                      className="absolute w-full cursor-pointer rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow"
                      style={{ top, backgroundColor: colores.bg, borderLeft: `3px solid ${colores.swatch}` }}
                      onClick={() => {
                        const maxFin = Math.max(...versiculos.map((x) => x.numero), nota.versiculo_inicio);
                        setNotaState({ versiculoNum: nota.versiculo_inicio, versiculoFinMax: maxFin, notaExistente: nota });
                      }}
                    >
                      <p className="font-inter text-[10px] font-semibold mb-1" style={{ color: colores.fg }}>
                        {nota.abreviatura_libro} {rango}
                      </p>
                      <p className="font-inter text-[11px] text-[#2C2C2C] leading-[1.45] line-clamp-4">
                        {nota.texto}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

          </div>{/* fin layout dos columnas */}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── Modo: Comparar ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modo === "comparar" && (
        <ComparadorPanel
          libros={libros}
          loadingLibros={loadingLibros}
          refComparar={refComparar}
          setRefComparar={setRefComparar}
          errorComparar={errorComparar}
          sugerencias={sugerenciasComparar}
          seleccionarSugerencia={seleccionarSugerenciaComparar}
          versionesComparar={versionesComparar}
          toggleVersionComparar={toggleVersionComparar}
          handleComparar={handleComparar}
          loadingComparar={loadingComparar}
          resultadosComparar={resultadosComparar}
        />
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

      {notaState && libroSeleccionado && (
        <NotaModal
          abreviatura_libro={libroSeleccionado.abreviatura}
          capitulo={Number(capituloNum)}
          versiculoInicio={notaState.versiculoNum}
          versiculoFinMax={notaState.versiculoFinMax}
          notaExistente={notaState.notaExistente}
          libroNombre={libroSeleccionado.nombre}
          versiculosCapitulo={versiculos.map((v) => ({ numero: v.numero, texto: v.texto }))}
          onGuardar={async (datos) => {
            await guardarNota({
              abreviatura_libro: libroSeleccionado.abreviatura,
              capitulo: Number(capituloNum),
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

      {comentarioAbierto && libroSeleccionado && (
        <ComentarioOverlay
          comentario={comentarioAbierto}
          referencia={`${libroSeleccionado.nombre} ${capituloNum}:${comentarioAbierto.versiculo_inicio}${comentarioAbierto.versiculo_inicio !== comentarioAbierto.versiculo_fin ? `–${comentarioAbierto.versiculo_fin}` : ""}`}
          onCerrar={() => setComentarioAbierto(null)}
        />
      )}
    </main>
  );
}

/* ── Panel Comparador ─────────────────────────────────────── */

interface ComparadorProps {
  libros: Libro[];
  loadingLibros: boolean;
  refComparar: string;
  setRefComparar: (v: string) => void;
  errorComparar: string;
  sugerencias: Libro[];
  seleccionarSugerencia: (l: Libro) => void;
  versionesComparar: string[];
  toggleVersionComparar: (v: string) => void;
  handleComparar: (e: React.FormEvent) => void;
  loadingComparar: boolean;
  resultadosComparar: ResultadoComparar[];
}

function ComparadorPanel({
  loadingLibros, refComparar, setRefComparar, errorComparar,
  sugerencias, seleccionarSugerencia,
  versionesComparar, toggleVersionComparar, handleComparar,
  loadingComparar, resultadosComparar,
}: ComparadorProps) {
  return (
    <>
      <p className="font-inter text-xs text-[#8A8A8A] mb-5">
        Compara el mismo pasaje en diferentes traducciones sin cambiar tu configuración.
      </p>

      <form onSubmit={handleComparar} className="mb-6 space-y-4">
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Pasaje a comparar
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={refComparar}
                onChange={(e) => setRefComparar(e.target.value)}
                placeholder="Juan 3 · Gén 1 · Sal 23"
                disabled={loadingLibros}
                autoComplete="off"
                className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors placeholder:text-[#C0BAB3] disabled:opacity-50"
              />
              {sugerencias.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-[#E8E4DF] rounded-lg bg-white z-20 overflow-hidden shadow-sm">
                  {sugerencias.map((libro) => (
                    <button
                      key={libro.id}
                      type="button"
                      onClick={() => seleccionarSugerencia(libro)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#FAF8F5] transition-colors border-b border-[#E8E4DF] last:border-0 flex items-center justify-between"
                    >
                      <span className="font-lora text-sm text-[#2C2C2C]">{libro.nombre}</span>
                      <span className="font-inter text-xs text-[#8A8A8A]">{libro.abreviatura}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loadingLibros || !refComparar.trim() || versionesComparar.length < 2 || loadingComparar}
              className="bg-[#4A6FA5] text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-40 shrink-0"
            >
              {loadingComparar ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Cargando
                </span>
              ) : "Comparar"}
            </button>
          </div>
          {errorComparar && <p className="font-inter text-xs text-red-400 mt-2">{errorComparar}</p>}
        </div>

        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">
            Versiones <span className="normal-case">(mín. 2)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {VERSIONES.map((v) => {
              const sel = versionesComparar.includes(v.valor);
              return (
                <button
                  key={v.valor}
                  type="button"
                  onClick={() => toggleVersionComparar(v.valor)}
                  title={v.desc}
                  className={`font-inter text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    sel
                      ? "bg-[#4A6FA5] text-white border-[#4A6FA5]"
                      : "text-[#8A8A8A] border-[#E8E4DF] hover:border-[#4A6FA5]/50 hover:text-[#4A6FA5] bg-[#FAF8F5]"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {loadingComparar && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {versionesComparar.map((v) => (
            <div key={v} className="border border-[#E8E4DF] rounded-xl p-5">
              <div className="h-3 w-16 bg-[#E8E4DF] rounded mb-4 animate-pulse" />
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-4 bg-[#E8E4DF] rounded animate-pulse" style={{ width: `${60 + (i * 11) % 40}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingComparar && resultadosComparar.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resultadosComparar.map((r) => (
            <VersionCard key={r.version} resultado={r} />
          ))}
        </div>
      )}

      {!loadingComparar && resultadosComparar.length === 0 && (
        <div className="text-center py-8">
          <p className="font-lora text-lg text-[#2C2C2C] mb-1">Selecciona un pasaje</p>
          <p className="font-inter text-sm text-[#8A8A8A]">
            Escribe una referencia y elige las versiones a comparar.
          </p>
        </div>
      )}
    </>
  );
}

/* ── Tarjeta de versión en el comparador ─────────────────── */

function VersionCard({ resultado }: { resultado: ResultadoComparar }) {
  const { version, versiculos, secciones, error, libroNombre } = resultado;
  const [copiado, setCopiado] = useState<number | null>(null);

  async function copiar(v: Versiculo) {
    const texto = `${v.texto} — ${libroNombre ?? ""} ${v.numero} (${version})`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(v.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch { /* clipboard no disponible */ }
  }

  return (
    <div className="border border-[#E8E4DF] rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#E8E4DF] flex items-center justify-between">
        <span className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest">{version}</span>
        {versiculos.length > 0 && (
          <span className="font-inter text-xs text-[#8A8A8A]">{versiculos.length} vs.</span>
        )}
      </div>
      <div className="px-4 py-4">
        {error ? (
          <p className="font-inter text-sm text-[#8A8A8A] italic">{error}</p>
        ) : versiculos.length === 0 ? (
          <p className="font-inter text-sm text-[#8A8A8A] italic">Sin versículos.</p>
        ) : (
          <div className="space-y-0.5">
            {versiculos.map((v) => {
              const seccion = secciones.find((s) => s.versiculo_inicio === v.numero);
              return (
                <div key={v.id}>
                  {seccion && (
                    <p className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest mt-5 mb-1.5">
                      {seccion.titulo}
                    </p>
                  )}
                  <p
                    onClick={() => copiar(v)}
                    title="Clic para copiar"
                    className={`font-lora text-sm leading-7 rounded-md px-1.5 -mx-1.5 cursor-pointer transition-colors ${
                      copiado === v.id ? "bg-[#4A6FA5]/10 text-[#4A6FA5]" : "text-[#2C2C2C] hover:bg-[#F0EDE8]"
                    }`}
                  >
                    <span className="text-[#8A8A8A] text-xs align-super mr-1 font-inter">{v.numero}</span>
                    {v.texto}
                    {copiado === v.id && (
                      <span className="ml-1.5 font-inter text-xs text-[#4A6FA5] not-italic">copiado</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
