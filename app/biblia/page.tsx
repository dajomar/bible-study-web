"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import apiClient from "@/lib/axios";

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

interface ResultadoBusqueda {
  id: number;
  numero: number;
  texto: string;
  capitulo: { numero: number; libro: { nombre: string } };
}

const FONT_SIZES = [
  { clase: "text-sm leading-7" },
  { clase: "text-base leading-8" },
  { clase: "text-lg leading-9" },
];

/* ── Parser de referencia ─────────────────────────────────── */

function parsearReferencia(
  input: string,
  libros: Libro[]
): { libro: Libro; capitulo: number; versiculo?: number } | null {
  const texto = input.trim();
  if (!texto) return null;

  const ordenados = [...libros].sort((a, b) => b.nombre.length - a.nombre.length);
  const textoLower = texto.toLowerCase();

  for (const libro of ordenados) {
    const candidatos = [libro.nombre.toLowerCase(), libro.abreviatura.toLowerCase()];
    for (const candidato of candidatos) {
      if (textoLower.startsWith(candidato)) {
        const resto = texto.slice(candidato.length).trim();
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

/* ── Componente principal ─────────────────────────────────── */

type Modo = "referencia" | "busqueda";

export default function BibliaPage() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [versiculos, setVersiculos] = useState<Versiculo[]>([]);

  const [libroId, setLibroId] = useState<string>("");
  const [capituloNum, setCapituloNum] = useState<string>("");

  const [loadingLibros, setLoadingLibros] = useState(true);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [loadingVers, setLoadingVers] = useState(false);

  const [version, setVersion] = useState<string>("");
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [tamano, setTamano] = useState(1);
  const [copiado, setCopiado] = useState<number | null>(null);

  // Modo de búsqueda
  const [modo, setModo] = useState<Modo>("referencia");

  // Referencia inteligente
  const [inputRef, setInputRef] = useState("");
  const [errorRef, setErrorRef] = useState("");
  const [explorarAbierto, setExplorarAbierto] = useState(false);

  // Versículo destacado
  const [versiculoDestacado, setVersiculoDestacado] = useState<number | null>(null);
  const versiculoRefs = useRef<Record<number, HTMLParagraphElement | null>>({});

  // Búsqueda por texto
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ libros: Libro[]; version: string }>("/api/biblia/libros")
      .then((res) => {
        setLibros(res.data.libros);
        setVersion(res.data.version);
      })
      .finally(() => setLoadingLibros(false));
  }, []);

  // Scroll al versículo destacado cuando cargan los versículos
  useEffect(() => {
    if (!versiculoDestacado || versiculos.length === 0) return;
    const el = versiculoRefs.current[versiculoDestacado];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      setTimeout(() => setVersiculoDestacado(null), 2500);
    }
  }, [versiculos, versiculoDestacado]);

  const cargarVersiculos = useCallback(async (libroIdVal: string, capNum: string) => {
    if (!libroIdVal || !capNum) return;
    setLoadingVers(true);
    setVersiculos([]);
    setSecciones([]);
    try {
      const res = await apiClient.get<{ versiculos: Versiculo[]; secciones: Seccion[] }>(
        `/api/biblia?libro_id=${libroIdVal}&capitulo=${capNum}`
      );
      setVersiculos(res.data.versiculos);
      setSecciones(res.data.secciones ?? []);
    } finally {
      setLoadingVers(false);
    }
  }, []);

  const handleLibroChange = useCallback(async (id: string) => {
    setLibroId(id);
    setCapituloNum("");
    setVersiculos([]);
    setVersiculoDestacado(null);
    if (!id) return;
    setLoadingCaps(true);
    try {
      const res = await apiClient.get<{ capitulos: Capitulo[] }>(`/api/biblia?libro_id=${id}`);
      setCapitulos(res.data.capitulos);
    } finally {
      setLoadingCaps(false);
    }
  }, []);

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

  async function handleBuscarReferencia(e: React.FormEvent) {
    e.preventDefault();
    setErrorRef("");
    if (!inputRef.trim()) return;

    const resultado = parsearReferencia(inputRef, libros);
    if (!resultado) {
      setErrorRef("No se reconoció la referencia. Prueba con «Juan 3:16» o «Gén 1».");
      return;
    }

    const { libro, capitulo, versiculo } = resultado;

    let caps = capitulos;
    if (String(libro.id) !== libroId) {
      setLoadingCaps(true);
      try {
        const res = await apiClient.get<{ capitulos: Capitulo[] }>(`/api/biblia?libro_id=${libro.id}`);
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

  async function handleBuscarTexto(e: React.FormEvent) {
    e.preventDefault();
    setErrorBusqueda("");
    if (inputBusqueda.trim().length < 3) {
      setErrorBusqueda("Escribe al menos 3 caracteres.");
      return;
    }
    setLoadingBusqueda(true);
    setBusquedaRealizada(false);
    setResultados([]);
    try {
      const res = await apiClient.get<{ resultados: ResultadoBusqueda[] }>(
        `/api/biblia/buscar?q=${encodeURIComponent(inputBusqueda.trim())}`
      );
      setResultados(res.data.resultados);
      setBusquedaRealizada(true);
    } catch {
      setErrorBusqueda("Error al realizar la búsqueda.");
    } finally {
      setLoadingBusqueda(false);
    }
  }

  async function irAVersiculo(r: ResultadoBusqueda) {
    const libro = libros.find((l) => l.nombre === r.capitulo.libro.nombre);
    if (!libro) return;
    setModo("referencia");

    let caps = capitulos;
    if (String(libro.id) !== libroId) {
      setLoadingCaps(true);
      try {
        const res = await apiClient.get<{ capitulos: Capitulo[] }>(`/api/biblia?libro_id=${libro.id}`);
        caps = res.data.capitulos;
        setCapitulos(caps);
      } finally {
        setLoadingCaps(false);
      }
    }

    setLibroId(String(libro.id));
    setCapituloNum(String(r.capitulo.numero));
    setVersiculoDestacado(r.numero);
    await cargarVersiculos(String(libro.id), String(r.capitulo.numero));
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
    } catch {
      // clipboard no disponible
    }
  }

  const libroSeleccionado = libros.find((l) => String(l.id) === libroId);
  const antiguoTestamento = libros.filter((l) => l.testamento === "Antiguo");
  const nuevoTestamento = libros.filter((l) => l.testamento === "Nuevo");
  const capActual = Number(capituloNum);
  const hayAnterior = capActual > 1;
  const haySiguiente = capActual > 0 && capActual < capitulos.length;

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8 md:mb-10">
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Biblia</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="font-inter text-sm text-[#8A8A8A]">Lector bíblico</p>
          {version && (
            <span className="font-inter text-xs text-[#8A8A8A] bg-[#FAF8F5] border border-[#E8E4DF] px-2 py-0.5 rounded-full">
              {version}
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs de modo ── */}
      <div className="flex gap-1 mb-5 border border-[#E8E4DF] rounded-lg p-1 w-fit">
        {(["referencia", "busqueda"] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`font-inter text-xs px-4 py-2 rounded-md transition-colors ${
              modo === m
                ? "bg-[#4A6FA5] text-white"
                : "text-[#8A8A8A] hover:text-[#2C2C2C]"
            }`}
          >
            {m === "referencia" ? "Ir a referencia" : "Buscar texto"}
          </button>
        ))}
      </div>

      {/* ── Modo: referencia ── */}
      {modo === "referencia" && (
        <>
          <form onSubmit={handleBuscarReferencia} className="mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputRef}
                onChange={(e) => { setInputRef(e.target.value); setErrorRef(""); }}
                placeholder="Juan 3:16 · Gén 1 · Sal 23:1"
                disabled={loadingLibros}
                className="flex-1 border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors placeholder:text-[#C0BAB3] disabled:opacity-50"
              />
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
          <div className="mb-8 md:mb-10">
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

          {/* Encabezado del pasaje */}
          {libroSeleccionado && capituloNum && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E4DF]">
              <div>
                <h2 className="font-lora text-xl text-[#2C2C2C]">
                  {libroSeleccionado.nombre} {capituloNum}
                </h2>
                {versiculos.length > 0 && (
                  <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">{versiculos.length} versículos</p>
                )}
              </div>
              <div className="flex items-center gap-1 border border-[#E8E4DF] rounded-lg overflow-hidden">
                <button
                  onClick={() => setTamano((t) => Math.max(0, t - 1))}
                  disabled={tamano === 0}
                  className="px-3 py-2 font-inter text-xs text-[#8A8A8A] hover:bg-[#F0EDE8] transition-colors disabled:opacity-30"
                >A−</button>
                <div className="w-px h-5 bg-[#E8E4DF]" />
                <button
                  onClick={() => setTamano((t) => Math.min(FONT_SIZES.length - 1, t + 1))}
                  disabled={tamano === FONT_SIZES.length - 1}
                  className="px-3 py-2 font-inter text-sm text-[#8A8A8A] hover:bg-[#F0EDE8] transition-colors disabled:opacity-30"
                >A+</button>
              </div>
            </div>
          )}

          {/* Skeleton */}
          {loadingVers && (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-5 bg-[#E8E4DF] rounded animate-pulse" style={{ width: `${65 + (i * 9) % 35}%` }} />
              ))}
            </div>
          )}

          {/* Versículos */}
          {!loadingVers && versiculos.length > 0 && (
            <div className="space-y-0.5">
              {/* Encabezado del capítulo */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#E8E4DF]" />
                <p className="font-lora text-sm text-[#4A6FA5] tracking-wide">
                  Capítulo {capituloNum}
                </p>
                <div className="flex-1 h-px bg-[#E8E4DF]" />
              </div>

              {versiculos.map((v) => {
                const destacado = versiculoDestacado === v.numero;
                const seccion = secciones.find((s) => s.versiculo_inicio === v.numero);
                return (
                  <div key={v.id}>
                    {seccion && (
                      <p className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest mt-6 mb-2 px-2 -mx-2">
                        {seccion.titulo}
                      </p>
                    )}
                    <p
                      ref={(el) => { versiculoRefs.current[v.numero] = el; }}
                      onClick={() => copiarVersiculo(v)}
                      title="Clic para copiar"
                      className={`font-lora ${FONT_SIZES[tamano].clase} rounded-md px-2 -mx-2 cursor-pointer transition-colors duration-500 ${
                        copiado === v.id
                          ? "bg-[#4A6FA5]/10 text-[#4A6FA5]"
                          : destacado
                          ? "bg-[#4A6FA5]/15 text-[#2C2C2C]"
                          : "text-[#2C2C2C] hover:bg-[#F0EDE8]"
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
          )}

          {/* Navegación prev/next */}
          {capituloNum && !loadingVers && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#E8E4DF]">
              <button
                onClick={() => navCapitulo(-1)}
                disabled={!hayAnterior}
                className="font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← {hayAnterior ? `${libroSeleccionado?.nombre} ${capActual - 1}` : ""}
              </button>
              <button
                onClick={() => navCapitulo(1)}
                disabled={!haySiguiente}
                className="font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {haySiguiente ? `${libroSeleccionado?.nombre} ${capActual + 1}` : ""} →
              </button>
            </div>
          )}

          {!loadingVers && !libroId && !loadingLibros && (
            <p className="font-inter text-sm text-[#8A8A8A]">Escribe una referencia para comenzar.</p>
          )}
          {!loadingVers && libroId && !capituloNum && capitulos.length > 0 && (
            <p className="font-inter text-sm text-[#8A8A8A]">Selecciona un capítulo para leer.</p>
          )}
        </>
      )}

      {/* ── Modo: búsqueda por texto ── */}
      {modo === "busqueda" && (
        <>
          <form onSubmit={handleBuscarTexto} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputBusqueda}
                onChange={(e) => { setInputBusqueda(e.target.value); setErrorBusqueda(""); setBusquedaRealizada(false); }}
                placeholder="no os afanéis · al principio creó Dios..."
                className="flex-1 border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors placeholder:text-[#C0BAB3]"
              />
              <button
                type="submit"
                disabled={loadingBusqueda || inputBusqueda.trim().length < 3}
                className="bg-[#4A6FA5] text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-40 shrink-0"
              >
                {loadingBusqueda ? "..." : "Buscar"}
              </button>
            </div>
            {errorBusqueda && <p className="font-inter text-xs text-red-400 mt-2">{errorBusqueda}</p>}
          </form>

          {/* Skeleton búsqueda */}
          {loadingBusqueda && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border border-[#E8E4DF] rounded-xl p-4">
                  <div className="h-3 w-28 bg-[#E8E4DF] rounded mb-2 animate-pulse" />
                  <div className="h-4 w-full bg-[#E8E4DF] rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Resultados */}
          {!loadingBusqueda && busquedaRealizada && (
            <>
              <p className="font-inter text-xs text-[#8A8A8A] mb-4">
                {resultados.length === 0
                  ? "Sin resultados para esa búsqueda."
                  : `${resultados.length} resultado${resultados.length !== 1 ? "s" : ""}${resultados.length === 30 ? " (mostrando los primeros 30)" : ""}`}
              </p>
              <div className="space-y-2">
                {resultados.map((r) => {
                  const referencia = `${r.capitulo.libro.nombre} ${r.capitulo.numero}:${r.numero}`;
                  // Highlight de la palabra buscada
                  const partes = r.texto.split(new RegExp(`(${inputBusqueda.trim()})`, "gi"));
                  return (
                    <button
                      key={r.id}
                      onClick={() => irAVersiculo(r)}
                      className="w-full text-left border border-[#E8E4DF] rounded-xl px-5 py-4 hover:bg-[#FAF8F5] hover:border-[#4A6FA5]/30 transition-colors group"
                    >
                      <p className="font-inter text-xs text-[#4A6FA5] uppercase tracking-wide mb-1.5 group-hover:text-[#3d5f8f]">
                        {referencia}
                      </p>
                      <p className="font-lora text-base text-[#2C2C2C] leading-7">
                        {partes.map((parte, i) =>
                          parte.toLowerCase() === inputBusqueda.trim().toLowerCase() ? (
                            <mark key={i} className="bg-[#4A6FA5]/15 text-[#2C2C2C] rounded px-0.5 not-italic">
                              {parte}
                            </mark>
                          ) : (
                            <span key={i}>{parte}</span>
                          )
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!busquedaRealizada && !loadingBusqueda && (
            <p className="font-inter text-sm text-[#8A8A8A]">
              Escribe una frase o palabra para buscar en toda la Biblia.
            </p>
          )}
        </>
      )}
    </main>
  );
}
