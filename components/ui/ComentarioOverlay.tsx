"use client";

import { useEffect, useRef, useState } from "react";
import type { Comentario } from "@/hooks/useComentarios";

function BookOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

/* ── Conversión de números romanos ──────────────────────────── */

const ROMANOS: Record<string, number> = {
  M: 1000, CM: 900, D: 500, CD: 400,
  C: 100, XC: 90, L: 50, XL: 40,
  X: 10, IX: 9, V: 5, IV: 4, I: 1,
};

function romanToInt(roman: string): number {
  let result = 0;
  let i = 0;
  const r = roman.toUpperCase();
  while (i < r.length) {
    const two = r.slice(i, i + 2);
    const one = r.slice(i, i + 1);
    if (ROMANOS[two]) { result += ROMANOS[two]; i += 2; }
    else if (ROMANOS[one]) { result += ROMANOS[one]; i += 1; }
    else break;
  }
  return result;
}

function convertirRomanosArabigos(texto: string): string {
  // Lookahead requiere dígito tras la coma/punto — evita falsos positivos en fin de frase
  return texto.replace(
    /\b(M{0,4}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3}))\b(?=\s*[,.]\s*\d)/gi,
    (match) => {
      const num = romanToInt(match);
      return num > 0 && num <= 200 ? String(num) : match;
    }
  );
}

/* ── Botón ícono ────────────────────────────────────────────── */

export function ComentarioIcono({
  comentario,
  onAbrir,
}: {
  comentario: Comentario;
  onAbrir: (c: Comentario) => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onAbrir(comentario); }}
      onMouseDown={(e) => e.preventDefault()}
      className="inline-flex items-center ml-1.5 text-[#4A6FA5] opacity-50 hover:opacity-100 transition-opacity align-middle"
      title="Comentario de Matthew Henry"
    >
      <BookOpenIcon />
    </button>
  );
}

/* ── Overlay principal ──────────────────────────────────────── */

export function ComentarioOverlay({
  comentario,
  referencia,
  onCerrar,
}: {
  comentario: Comentario;
  referencia: string;
  onCerrar: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  if (isMobile) {
    return <BottomSheet comentario={comentario} referencia={referencia} onCerrar={onCerrar} />;
  }
  return <Modal comentario={comentario} referencia={referencia} onCerrar={onCerrar} />;
}

/* ── Modal desktop ──────────────────────────────────────────── */

function Modal({
  comentario,
  referencia,
  onCerrar,
}: {
  comentario: Comentario;
  referencia: string;
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      onClick={onCerrar}
    >
      <div
        className="relative bg-[#FAF8F5] rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]"
        style={{ animation: "comentario-in 150ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ContenidoComentario
          comentario={comentario}
          referencia={referencia}
          onCerrar={onCerrar}
        />
      </div>
      <style>{`
        @keyframes comentario-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Bottom sheet mobile ────────────────────────────────────── */

function BottomSheet({
  comentario,
  referencia,
  onCerrar,
}: {
  comentario: Comentario;
  referencia: string;
  onCerrar: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) return; // no subir más
    currentY.current = delta;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }

  function onTouchEnd() {
    if (currentY.current > 80) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 250ms ease-out";
        sheetRef.current.style.transform = "translateY(100%)";
      }
      setTimeout(onCerrar, 220);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 200ms ease-out";
        sheetRef.current.style.transform = "translateY(0)";
        setTimeout(() => {
          if (sheetRef.current) sheetRef.current.style.transition = "";
        }, 200);
      }
    }
    startY.current = null;
    currentY.current = 0;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      onClick={onCerrar}
    >
      <div
        ref={sheetRef}
        className="w-full bg-[#FAF8F5] rounded-t-2xl shadow-xl flex flex-col max-h-[75vh]"
        style={{ animation: "sheet-in 250ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E8E4DF]" />
        </div>

        <ContenidoComentario
          comentario={comentario}
          referencia={referencia}
          onCerrar={onCerrar}
        />
      </div>
      <style>{`
        @keyframes sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Contenido compartido ───────────────────────────────────── */

function ContenidoComentario({
  comentario,
  referencia,
  onCerrar,
}: {
  comentario: Comentario;
  referencia: string;
  onCerrar: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#E8E4DF] shrink-0">
        <div>
          <h2 className="font-lora text-lg text-[#2C2C2C] leading-snug">{referencia}</h2>
          {comentario.titulo_seccion && (
            <p className="font-inter text-xs text-[#4A6FA5] uppercase tracking-widest mt-1">
              {comentario.titulo_seccion}
            </p>
          )}
        </div>
        <button
          onClick={onCerrar}
          className="shrink-0 font-inter text-lg text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors leading-none mt-0.5"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* Cuerpo con scroll */}
      <div className="overflow-y-auto px-6 py-5 flex-1">
        <p className="font-lora text-sm text-[#2C2C2C] leading-7 whitespace-pre-line">
          {convertirRomanosArabigos(comentario.texto)}
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#E8E4DF] shrink-0">
        <p className="font-inter text-xs text-[#8A8A8A]">
          Matthew Henry · Comentario bíblico · Dominio público
        </p>
      </div>
    </>
  );
}
