"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axios";
import { COLORES_RESALTADO } from "@/components/ui/FloatingVerseMenu";

interface ResaltadoDetalle {
  id_versiculo: number;
  color: string;
  numero: number;
  texto: string;
  capitulo: number;
  libro: {
    nombre: string;
    testamento: string;
    orden: number;
    abreviatura: string;
  };
}

interface Grupo {
  libro: ResaltadoDetalle["libro"];
  versiculos: ResaltadoDetalle[];
}

export default function ResaltadosPage() {
  const [resaltados, setResaltados] = useState<ResaltadoDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [quitando, setQuitando] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get<{ resaltados: ResaltadoDetalle[] }>("/api/resaltados/todos")
      .then((res) => setResaltados(res.data.resaltados))
      .finally(() => setLoading(false));
  }, []);

  async function quitar(id_versiculo: number) {
    setQuitando(id_versiculo);
    try {
      await apiClient.delete(`/api/resaltados/${id_versiculo}`);
      setResaltados((prev) => prev.filter((r) => r.id_versiculo !== id_versiculo));
    } finally {
      setQuitando(null);
    }
  }

  // Agrupar por testamento → libro (ordenado por libro.orden)
  const antiguo = agrupar(resaltados.filter((r) => r.libro.testamento === "Antiguo"));
  const nuevo = agrupar(resaltados.filter((r) => r.libro.testamento === "Nuevo"));

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8 md:mb-10 flex items-start justify-between">
        <div>
          <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Mis Resaltados</h1>
          {!loading && (
            <p className="font-inter text-sm text-[#8A8A8A] mt-1">
              {resaltados.length === 0
                ? "Aún no tienes versículos resaltados"
                : `${resaltados.length} versículo${resaltados.length !== 1 ? "s" : ""} resaltado${resaltados.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {/* Leyenda de colores */}
        {!loading && resaltados.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 mt-1">
            {Object.entries(COLORES_RESALTADO).map(([token, { swatch }]) => (
              <span
                key={token}
                style={{ backgroundColor: swatch }}
                className="w-3.5 h-3.5 rounded-full"
                title={token.charAt(0).toUpperCase() + token.slice(1)}
              />
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-[#E8E4DF] rounded-xl p-5 space-y-3">
              <div className="h-3 w-24 bg-[#E8E4DF] rounded animate-pulse" />
              <div className="h-4 w-full bg-[#E8E4DF] rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-[#E8E4DF] rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && resaltados.length === 0 && (
        <div className="border border-[#E8E4DF] rounded-xl p-8 text-center">
          <p className="font-lora text-lg text-[#2C2C2C] mb-2">Sin resaltados todavía</p>
          <p className="font-inter text-sm text-[#8A8A8A]">
            Toca un versículo en cualquier página de lectura y elige «Resaltar» para marcarlo.
          </p>
        </div>
      )}

      {!loading && resaltados.length > 0 && (
        <div className="space-y-10">
          {antiguo.length > 0 && (
            <TestamentoSection
              titulo="Antiguo Testamento"
              grupos={antiguo}
              quitando={quitando}
              onQuitar={quitar}
            />
          )}
          {nuevo.length > 0 && (
            <TestamentoSection
              titulo="Nuevo Testamento"
              grupos={nuevo}
              quitando={quitando}
              onQuitar={quitar}
            />
          )}
        </div>
      )}
    </main>
  );
}

function agrupar(versiculos: ResaltadoDetalle[]): Grupo[] {
  const map = new Map<string, Grupo>();
  for (const v of versiculos) {
    const key = v.libro.nombre;
    if (!map.has(key)) map.set(key, { libro: v.libro, versiculos: [] });
    map.get(key)!.versiculos.push(v);
  }
  return Array.from(map.values()).sort((a, b) => a.libro.orden - b.libro.orden);
}

function TestamentoSection({
  titulo,
  grupos,
  quitando,
  onQuitar,
}: {
  titulo: string;
  grupos: Grupo[];
  quitando: number | null;
  onQuitar: (id: number) => void;
}) {
  return (
    <div>
      <h2 className="font-inter text-xs text-[#8A8A8A] uppercase tracking-widest mb-5">{titulo}</h2>
      <div className="space-y-6">
        {grupos.map((g) => (
          <div key={g.libro.nombre}>
            <h3 className="font-lora text-base text-[#2C2C2C] mb-3 flex items-center gap-2">
              {g.libro.nombre}
              <span className="font-inter text-xs text-[#8A8A8A]">
                {g.versiculos.length} vs.
              </span>
            </h3>
            <div className="space-y-2">
              {g.versiculos.map((r) => {
                const colores = COLORES_RESALTADO[r.color];
                return (
                  <div
                    key={r.id_versiculo}
                    style={{
                      backgroundColor: colores.bg,
                      borderLeftColor: colores.swatch,
                    }}
                    className="border border-[#E8E4DF] border-l-4 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p
                        className="font-inter text-xs font-medium mb-1"
                        style={{ color: colores.fg }}
                      >
                        {g.libro.abreviatura} {r.capitulo}:{r.numero}
                      </p>
                      <p className="font-lora text-sm leading-7 text-[#2C2C2C]">
                        {r.texto}
                      </p>
                    </div>
                    <button
                      onClick={() => onQuitar(r.id_versiculo)}
                      disabled={quitando === r.id_versiculo}
                      className="shrink-0 font-inter text-xs text-[#8A8A8A] hover:text-red-400 transition-colors mt-0.5 disabled:opacity-40"
                      title="Quitar resaltado"
                    >
                      {quitando === r.id_versiculo ? "..." : "✕"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
