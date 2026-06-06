"use client";

import { useEffect, useRef, useState } from "react";
import type { Nota } from "@/hooks/useNotas";

export const COLORES_NOTA: Record<string, { bg: string; fg: string; swatch: string }> = {
  amarillo: { bg: "#FEF9C3", fg: "#854D0E", swatch: "#FDE047" },
  verde:    { bg: "#DCFCE7", fg: "#166534", swatch: "#86EFAC" },
  azul:     { bg: "#DBEAFE", fg: "#1E40AF", swatch: "#93C5FD" },
  rosado:   { bg: "#FCE7F3", fg: "#9D174D", swatch: "#F9A8D4" },
};

const COLORES_ORDEN = ["amarillo", "verde", "azul", "rosado"] as const;

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/* ── Ícono de nota inline ───────────────────────────────────── */

export function NotaIcono({ nota, onAbrir }: { nota: Nota; onAbrir: (n: Nota) => void }) {
  const color = COLORES_NOTA[nota.color] ?? COLORES_NOTA.amarillo;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onAbrir(nota); }}
      onMouseDown={(e) => e.preventDefault()}
      className="inline-flex items-center gap-0.5 ml-1.5 opacity-50 hover:opacity-100 transition-opacity align-middle"
      style={{ color: color.fg }}
      title="Ver nota"
    >
      <PencilIcon />
      <span
        style={{ backgroundColor: color.swatch }}
        className="w-1.5 h-1.5 rounded-full"
      />
    </button>
  );
}

/* ── Props del modal ────────────────────────────────────────── */

export interface NotaModalProps {
  abreviatura_libro: string;
  capitulo: number;
  versiculoInicio: number;
  versiculoFinMax: number;
  notaExistente?: Nota | null;
  libroNombre: string;
  /** Versículos del capítulo para mostrar el texto anotado en el modal. */
  versiculosCapitulo?: { numero: number; texto: string }[];
  onGuardar: (datos: { versiculo_fin: number; texto: string; color: string }) => void;
  onEliminar?: () => void;
  onCerrar: () => void;
}

/* ── Componente principal ───────────────────────────────────── */

export function NotaModal(props: NotaModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onCerrar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onCerrar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isMobile) return <BottomSheetNota {...props} />;
  return <ModalNota {...props} />;
}

/* ── Modal desktop ──────────────────────────────────────────── */

function ModalNota(props: NotaModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      onClick={props.onCerrar}
    >
      <div
        className="relative bg-[#FAF8F5] rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]"
        style={{ animation: "nota-in 150ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ContenidoNota {...props} />
      </div>
      <style>{`
        @keyframes nota-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Bottom sheet mobile ────────────────────────────────────── */

function BottomSheetNota(props: NotaModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) return;
    currentY.current = delta;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
  }

  function onTouchEnd() {
    if (currentY.current > 80) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 250ms ease-out";
        sheetRef.current.style.transform = "translateY(100%)";
      }
      setTimeout(props.onCerrar, 220);
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
      onClick={props.onCerrar}
    >
      <div
        ref={sheetRef}
        className="w-full bg-[#FAF8F5] rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
        style={{ animation: "sheet-nota-in 250ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E8E4DF]" />
        </div>
        <ContenidoNota {...props} />
      </div>
      <style>{`
        @keyframes sheet-nota-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Contenido compartido ───────────────────────────────────── */

function ContenidoNota({
  capitulo,
  versiculoInicio,
  versiculoFinMax,
  notaExistente,
  libroNombre,
  versiculosCapitulo,
  onGuardar,
  onEliminar,
  onCerrar,
}: NotaModalProps) {
  const [versiculoFin, setVersiculoFin] = useState(
    notaExistente?.versiculo_fin ?? versiculoInicio
  );
  const [texto, setTexto] = useState(notaExistente?.texto ?? "");
  const [color, setColor] = useState(notaExistente?.color ?? "amarillo");
  const [guardando, setGuardando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const versiculosEnRango = (versiculosCapitulo ?? []).filter(
    (v) => v.numero >= versiculoInicio && v.numero <= versiculoFin
  );

  const rangoLabel =
    versiculoFin > versiculoInicio
      ? `${libroNombre} ${capitulo}:${versiculoInicio}–${versiculoFin}`
      : `${libroNombre} ${capitulo}:${versiculoInicio}`;

  async function handleGuardar() {
    if (!texto.trim()) return;
    setGuardando(true);
    try {
      await onGuardar({ versiculo_fin: versiculoFin, texto: texto.trim(), color });
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#E8E4DF] shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="font-lora text-base text-[#2C2C2C]">{rangoLabel}</h2>
          {/* Selector de versículo fin */}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-inter text-xs text-[#8A8A8A]">Hasta v.</span>
            <button
              onClick={() => setVersiculoFin((v) => Math.max(versiculoInicio, v - 1))}
              disabled={versiculoFin <= versiculoInicio}
              className="w-6 h-6 flex items-center justify-center text-[#8A8A8A] hover:text-[#2C2C2C] disabled:opacity-30 rounded transition-colors font-inter text-sm leading-none"
            >
              −
            </button>
            <span className="font-inter text-sm text-[#2C2C2C] w-5 text-center tabular-nums">
              {versiculoFin}
            </span>
            <button
              onClick={() => setVersiculoFin((v) => Math.min(versiculoFinMax, v + 1))}
              disabled={versiculoFin >= versiculoFinMax}
              className="w-6 h-6 flex items-center justify-center text-[#8A8A8A] hover:text-[#2C2C2C] disabled:opacity-30 rounded transition-colors font-inter text-sm leading-none"
            >
              +
            </button>
          </div>
        </div>
        <button
          onClick={onCerrar}
          className="shrink-0 font-inter text-lg text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors leading-none mt-0.5"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* Body: texto bíblico + color + textarea */}
      <div className="overflow-y-auto px-6 py-5 flex-1 flex flex-col gap-4">
        {/* Texto del versículo anotado */}
        {versiculosEnRango.length > 0 && (
          <div
            className="rounded-lg px-4 py-3 border-l-2 border-[#4A6FA5] max-h-28 overflow-y-auto"
            style={{ backgroundColor: "#F0EDE8" }}
          >
            {versiculosEnRango.map((v) => (
              <p key={v.numero} className="font-lora text-sm text-[#2C2C2C] leading-6">
                <span className="text-[#8A8A8A] text-xs align-super mr-1 font-inter not-italic">
                  {v.numero}
                </span>
                {v.texto}
              </p>
            ))}
          </div>
        )}

        {/* Colores */}
        <div className="flex items-center gap-3">
          {COLORES_ORDEN.map((token) => (
            <button
              key={token}
              onClick={() => setColor(token)}
              style={{
                backgroundColor: COLORES_NOTA[token].swatch,
                outline: color === token ? "2px solid #4A6FA5" : "2px solid transparent",
                outlineOffset: "2px",
              }}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform shrink-0"
              title={token.charAt(0).toUpperCase() + token.slice(1)}
            />
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleGuardar();
            }
          }}
          placeholder="Escribe tu nota… (Ctrl+Enter para guardar)"
          rows={5}
          className="font-inter text-sm text-[#2C2C2C] w-full resize-none border border-[#E8E4DF] rounded-xl px-4 py-3 focus:outline-none focus:border-[#4A6FA5] bg-white placeholder:text-[#C0BAB3] leading-6"
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#E8E4DF] shrink-0 flex items-center justify-between gap-3">
        <div>
          {notaExistente && onEliminar && (
            <button
              onClick={onEliminar}
              className="font-inter text-xs text-[#8A8A8A] hover:text-red-400 transition-colors"
            >
              Eliminar nota
            </button>
          )}
        </div>
        <button
          onClick={handleGuardar}
          disabled={guardando || !texto.trim()}
          className="font-inter text-sm text-white bg-[#4A6FA5] hover:bg-[#3d5f8f] px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {guardando ? "Guardando..." : notaExistente ? "Actualizar" : "Guardar"}
        </button>
      </div>
    </>
  );
}
