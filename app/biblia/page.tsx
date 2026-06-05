"use client";

import { useEffect, useState, useCallback } from "react";
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

const FONT_SIZES = [
  { label: "A", clase: "text-sm leading-7" },
  { label: "A", clase: "text-base leading-8" },
  { label: "A", clase: "text-lg leading-9" },
];

export default function BibliaPage() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [versiculos, setVersiculos] = useState<Versiculo[]>([]);

  const [libroId, setLibroId] = useState<string>("");
  const [capituloNum, setCapituloNum] = useState<string>("");

  const [loadingLibros, setLoadingLibros] = useState(true);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [loadingVers, setLoadingVers] = useState(false);

  const [tamano, setTamano] = useState(1); // índice en FONT_SIZES
  const [copiado, setCopiado] = useState<number | null>(null); // id del versículo copiado

  useEffect(() => {
    apiClient
      .get<{ libros: Libro[] }>("/api/biblia/libros")
      .then((res) => setLibros(res.data.libros))
      .finally(() => setLoadingLibros(false));
  }, []);

  const cargarVersiculos = useCallback(async (libroIdVal: string, capNum: string) => {
    if (!libroIdVal || !capNum) return;
    setLoadingVers(true);
    setVersiculos([]);
    try {
      const res = await apiClient.get<{ versiculos: Versiculo[] }>(
        `/api/biblia?libro_id=${libroIdVal}&capitulo=${capNum}`
      );
      setVersiculos(res.data.versiculos);
    } finally {
      setLoadingVers(false);
    }
  }, []);

  const handleLibroChange = useCallback(async (id: string) => {
    setLibroId(id);
    setCapituloNum("");
    setVersiculos([]);
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
    await cargarVersiculos(libroId, num);
  }, [libroId, cargarVersiculos]);

  function navCapitulo(delta: number) {
    const actual = Number(capituloNum);
    const siguiente = actual + delta;
    if (siguiente < 1 || siguiente > capitulos.length) return;
    const num = String(siguiente);
    setCapituloNum(num);
    cargarVersiculos(libroId, num);
  }

  async function copiarVersiculo(v: Versiculo) {
    const libro = libros.find((l) => String(l.id) === libroId);
    const referencia = libro ? `${libro.nombre} ${capituloNum}:${v.numero}` : "";
    const texto = referencia ? `${v.texto} — ${referencia}` : v.texto;
    try {
      await navigator.clipboard.writeText(texto);
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
        <p className="font-inter text-sm text-[#8A8A8A] mt-1">
          Reina Valera — selecciona libro y capítulo
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Libro
          </label>
          {loadingLibros ? (
            <div className="h-11 bg-[#E8E4DF] rounded-lg animate-pulse" />
          ) : (
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
          )}
        </div>

        <div className="sm:w-36">
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Capítulo
          </label>
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

      {/* Encabezado del pasaje + controles de tamaño */}
      {libroSeleccionado && capituloNum && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E4DF]">
          <div>
            <h2 className="font-lora text-xl text-[#2C2C2C]">
              {libroSeleccionado.nombre} {capituloNum}
            </h2>
            {versiculos.length > 0 && (
              <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">
                {versiculos.length} versículos
              </p>
            )}
          </div>

          {/* Control de tamaño de texto */}
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
      )}

      {/* Versículos */}
      {loadingVers && (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-5 bg-[#E8E4DF] rounded animate-pulse"
              style={{ width: `${65 + (i * 9) % 35}%` }}
            />
          ))}
        </div>
      )}

      {!loadingVers && versiculos.length > 0 && (
        <div className="space-y-0.5">
          {versiculos.map((v) => (
            <p
              key={v.id}
              onClick={() => copiarVersiculo(v)}
              title="Clic para copiar"
              className={`font-lora ${FONT_SIZES[tamano].clase} text-[#2C2C2C] rounded-md px-2 -mx-2 cursor-pointer transition-colors ${
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
          ))}
        </div>
      )}

      {/* Navegación prev/next */}
      {capituloNum && !loadingVers && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#E8E4DF]">
          <button
            onClick={() => navCapitulo(-1)}
            disabled={!hayAnterior}
            className="flex items-center gap-2 font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← {hayAnterior ? `${libroSeleccionado?.nombre} ${capActual - 1}` : ""}
          </button>
          <button
            onClick={() => navCapitulo(1)}
            disabled={!haySiguiente}
            className="flex items-center gap-2 font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {haySiguiente ? `${libroSeleccionado?.nombre} ${capActual + 1}` : ""} →
          </button>
        </div>
      )}

      {!loadingVers && libroId && !capituloNum && capitulos.length > 0 && (
        <p className="font-inter text-sm text-[#8A8A8A]">Selecciona un capítulo para leer.</p>
      )}

      {!libroId && !loadingLibros && (
        <p className="font-inter text-sm text-[#8A8A8A]">Selecciona un libro para comenzar.</p>
      )}
    </main>
  );
}
