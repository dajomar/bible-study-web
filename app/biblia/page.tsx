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

export default function BibliaPage() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [versiculos, setVersiculos] = useState<Versiculo[]>([]);

  const [libroId, setLibroId] = useState<string>("");
  const [capituloNum, setCapituloNum] = useState<string>("");

  const [loadingLibros, setLoadingLibros] = useState(true);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [loadingVers, setLoadingVers] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ libros: Libro[] }>("/api/biblia/libros")
      .then((res) => setLibros(res.data.libros))
      .finally(() => setLoadingLibros(false));
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
    setVersiculos([]);
    if (!num || !libroId) return;

    setLoadingVers(true);
    try {
      const res = await apiClient.get<{ versiculos: Versiculo[] }>(
        `/api/biblia?libro_id=${libroId}&capitulo=${num}`
      );
      setVersiculos(res.data.versiculos);
    } finally {
      setLoadingVers(false);
    }
  }, [libroId]);

  const libroSeleccionado = libros.find((l) => String(l.id) === libroId);
  const antiguoTestamento = libros.filter((l) => l.testamento === "Antiguo");
  const nuevoTestamento = libros.filter((l) => l.testamento === "Nuevo");

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8 md:mb-10">
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Biblia</h1>
        <p className="font-inter text-sm text-[#8A8A8A] mt-1">
          Reina Valera — selecciona libro y capítulo
        </p>
      </div>

      {/* Controles — apilados en móvil, en fila en desktop */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 md:mb-10">
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

      {/* Encabezado del pasaje */}
      {libroSeleccionado && capituloNum && (
        <div className="mb-6 pb-4 border-b border-[#E8E4DF]">
          <h2 className="font-lora text-xl text-[#2C2C2C]">
            {libroSeleccionado.nombre} {capituloNum}
          </h2>
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
        <div className="space-y-1">
          {versiculos.map((v) => (
            <p key={v.id} className="font-lora text-base md:text-[1.05rem] leading-8 text-[#2C2C2C]">
              <span className="text-[#8A8A8A] text-xs align-super mr-1.5 font-inter">{v.numero}</span>
              {v.texto}
            </p>
          ))}
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
