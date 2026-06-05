"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

const VERSIONES_TODAS = ["RV1909", "RVR1960", "NVI", "TLA"];

interface Versiculo {
  id: number;
  numero: number;
  texto: string;
}

interface ResultadoVersion {
  version: string;
  texto?: string;
  error?: string;
}

export default function CompararPage() {
  return (
    <Suspense>
      <CompararContent />
    </Suspense>
  );
}

function CompararContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const libro = searchParams.get("libro") ?? "";
  const capitulo = Number(searchParams.get("capitulo") ?? "0");
  const versiculo = Number(searchParams.get("versiculo") ?? "0");

  const [resultados, setResultados] = useState<ResultadoVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!libro || !capitulo || !versiculo) {
      setError("Referencia incompleta.");
      setLoading(false);
      return;
    }
    apiClient
      .get<{ resultados: { version: string; versiculos: Versiculo[]; error?: string }[] }>(
        `/api/biblia/comparar?libro=${encodeURIComponent(libro)}&capitulo=${capitulo}&versiones=${VERSIONES_TODAS.join(",")}`
      )
      .then((res) => {
        const mapped = res.data.resultados.map((r) => {
          const v = r.versiculos.find((v) => v.numero === versiculo);
          return {
            version: r.version,
            texto: v?.texto,
            error: r.error ?? (!v ? "Versículo no disponible en esta versión" : undefined),
          };
        });
        setResultados(mapped);
      })
      .catch(() => setError("No se pudo cargar la comparación."))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const referencia = libro && capitulo && versiculo ? `${libro} ${capitulo}:${versiculo}` : "—";

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors mb-5 flex items-center gap-1"
        >
          ← Volver
        </button>
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1">
          Comparación de versiones
        </p>
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">{referencia}</h1>
      </div>

      {error && <p className="font-inter text-sm text-red-400">{error}</p>}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VERSIONES_TODAS.map((v) => (
            <div key={v} className="border border-[#E8E4DF] rounded-xl p-5">
              <div className="h-3 w-16 bg-[#E8E4DF] rounded mb-4 animate-pulse" />
              <div className="h-5 w-full bg-[#E8E4DF] rounded animate-pulse mb-2" />
              <div className="h-5 w-4/5 bg-[#E8E4DF] rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && resultados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resultados.map((r) => (
            <div key={r.version} className="border border-[#E8E4DF] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#E8E4DF]">
                <span className="font-inter text-xs font-medium text-[#4A6FA5] uppercase tracking-widest">
                  {r.version}
                </span>
              </div>
              <div className="px-5 py-5">
                {r.error ? (
                  <p className="font-inter text-sm text-[#8A8A8A] italic">{r.error}</p>
                ) : (
                  <p className="font-lora text-base leading-8 text-[#2C2C2C]">{r.texto}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
