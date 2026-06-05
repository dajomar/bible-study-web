"use client";

import { useState } from "react";

export const COLORES_RESALTADO: Record<string, { bg: string; fg: string; swatch: string }> = {
  amarillo: { bg: "#FEF9C3", fg: "#854D0E", swatch: "#FDE047" },
  verde:    { bg: "#DCFCE7", fg: "#166534", swatch: "#86EFAC" },
  azul:     { bg: "#DBEAFE", fg: "#1E40AF", swatch: "#93C5FD" },
  rosa:     { bg: "#FCE7F3", fg: "#9D174D", swatch: "#F9A8D4" },
  naranja:  { bg: "#FFEDD5", fg: "#9A3412", swatch: "#FDBA74" },
};

const COLORES_ORDEN = ["amarillo", "verde", "azul", "rosa", "naranja"] as const;

interface Props {
  versiculoId: number;
  rect: DOMRect;
  resaltadoActual?: string;
  onColor: (versiculoId: number, color: string) => void;
  onQuitar: (versiculoId: number) => void;
  onCopiar: () => void;
  onCompartir: () => void;
  onComparar: () => void;
}

export function FloatingVerseMenu({
  versiculoId, rect, resaltadoActual,
  onColor, onQuitar, onCopiar, onCompartir, onComparar,
}: Props) {
  const [vista, setVista] = useState<"acciones" | "resaltar">("acciones");

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - 8}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
      }}
      data-highlight-menu="true"
      className="bg-white border border-[#E8E4DF] rounded-xl shadow-lg px-2.5 py-2 flex items-center gap-0.5 select-none"
    >
      {vista === "acciones" ? (
        <>
          <button
            onClick={() => setVista("resaltar")}
            className={`font-inter text-xs px-2 py-1 rounded-lg transition-colors ${
              resaltadoActual
                ? "text-[#4A6FA5] font-medium bg-[#4A6FA5]/8"
                : "text-[#2C2C2C] hover:bg-[#F0EDE8]"
            }`}
          >
            Resaltar
          </button>
          <div className="w-px h-4 bg-[#E8E4DF] mx-0.5" />
          <button
            onClick={onCopiar}
            className="font-inter text-xs text-[#2C2C2C] hover:bg-[#F0EDE8] px-2 py-1 rounded-lg transition-colors"
          >
            Copiar
          </button>
          <div className="w-px h-4 bg-[#E8E4DF] mx-0.5" />
          <button
            onClick={onCompartir}
            className="font-inter text-xs text-[#2C2C2C] hover:bg-[#F0EDE8] px-2 py-1 rounded-lg transition-colors"
          >
            Compartir
          </button>
          <div className="w-px h-4 bg-[#E8E4DF] mx-0.5" />
          <button
            onClick={onComparar}
            className="font-inter text-xs text-[#2C2C2C] hover:bg-[#F0EDE8] px-2 py-1 rounded-lg transition-colors"
          >
            Comparar
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setVista("acciones")}
            className="font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors px-1 py-1 mr-0.5"
            title="Volver"
          >
            ←
          </button>
          {COLORES_ORDEN.map((token) => (
            <button
              key={token}
              onClick={() => onColor(versiculoId, token)}
              style={{
                backgroundColor: COLORES_RESALTADO[token].swatch,
                outline: resaltadoActual === token ? "2px solid #4A6FA5" : "2px solid transparent",
                outlineOffset: "1px",
              }}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0 mx-0.5"
              title={token.charAt(0).toUpperCase() + token.slice(1)}
            />
          ))}
          {resaltadoActual && (
            <>
              <div className="w-px h-4 bg-[#E8E4DF] mx-1" />
              <button
                onClick={() => onQuitar(versiculoId)}
                className="font-inter text-xs text-[#8A8A8A] hover:text-red-400 transition-colors px-1"
                title="Quitar resaltado"
              >
                ✕
              </button>
            </>
          )}
        </>
      )}

      {/* Caret apuntando hacia abajo */}
      <span
        style={{
          position: "absolute",
          bottom: -6, left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid #E8E4DF",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: -5, left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid white",
        }}
      />
    </div>
  );
}
