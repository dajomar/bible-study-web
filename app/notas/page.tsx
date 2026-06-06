"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axios";
import { COLORES_NOTA } from "@/components/ui/NotaModal";

interface NotaDetalle {
  id: number;
  abreviatura_libro: string;
  capitulo: number;
  versiculo_inicio: number;
  versiculo_fin: number;
  texto: string;
  color: string;
  updated_at: string;
  versiculos_texto: string[];
  libro: {
    nombre: string;
    testamento: string;
    orden: number;
  };
}

interface Grupo {
  libro: NotaDetalle["libro"];
  abreviatura: string;
  notas: NotaDetalle[];
}

const COLORES_ORDEN = ["amarillo", "verde", "azul", "rosado"] as const;

function formatFechaNota(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "";
  }
}

function exportarNotas(notas: NotaDetalle[]) {
  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  const lineas: string[] = [
    "MIS NOTAS BÍBLICAS",
    `Exportado el ${fecha}`,
    "",
  ];

  const porTestamento = (t: string) => notas.filter((n) => n.libro.testamento === t);

  for (const [titulo, test] of [["ANTIGUO TESTAMENTO", "Antiguo"], ["NUEVO TESTAMENTO", "Nuevo"]] as const) {
    const grupo = porTestamento(test);
    if (!grupo.length) continue;

    lineas.push(`━━━ ${titulo} ${"━".repeat(Math.max(0, 40 - titulo.length - 5))}`);
    lineas.push("");

    const libros = Array.from(new Map(grupo.map((n) => [n.abreviatura_libro, n.libro])).entries());
    for (const [abrev, libro] of libros) {
      lineas.push(libro.nombre.toUpperCase());
      for (const n of grupo.filter((x) => x.abreviatura_libro === abrev)) {
        const rango = n.versiculo_fin > n.versiculo_inicio
          ? `${n.capitulo}:${n.versiculo_inicio}–${n.versiculo_fin}`
          : `${n.capitulo}:${n.versiculo_inicio}`;
        const fechaNota = formatFechaNota(n.updated_at);
        lineas.push(`  ${n.abreviatura_libro} ${rango}${fechaNota ? `  [${fechaNota}]` : ""}`);
        if (n.versiculos_texto?.length) {
          lineas.push(`  «${n.versiculos_texto.join(" ")}»`);
        }
        lineas.push(`  Nota: ${n.texto}`);
        lineas.push("");
      }
    }
  }

  const blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notas-biblicas-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportarPDF(notas: NotaDetalle[]) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ML = 18, MR = 18, MT = 18, MB = 20;
  const PW = 210, PH = 297;
  const CW = PW - ML - MR;
  const LINE_H = 5.2;
  const INNER_X = ML + 6;
  const INNER_W = CW - 9;

  let y = MT;

  function checkBreak(need: number) {
    if (y + need > PH - MB) { doc.addPage(); y = MT; }
  }

  function hexRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  const NOTA_BG:     Record<string, string> = { amarillo: "#FEF9C3", verde: "#DCFCE7", azul: "#DBEAFE", rosado: "#FCE7F3" };
  const NOTA_BAR:    Record<string, string> = { amarillo: "#FDE047", verde: "#86EFAC", azul: "#93C5FD", rosado: "#F9A8D4" };
  const NOTA_FG:     Record<string, string> = { amarillo: "#854D0E", verde: "#166534", azul: "#1E40AF", rosado: "#9D174D" };

  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  // ── Título ──
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(44, 44, 44);
  doc.text("Mis Notas B\u00EDblicas", ML, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(138, 138, 138);
  doc.text(`Exportado el ${fecha} \u00B7 ${notas.length} nota${notas.length !== 1 ? "s" : ""}`, ML, y);
  y += 4;

  doc.setDrawColor(232, 228, 223);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 8;

  // ── Testamentos ──
  for (const [testLabel, testKey] of [
    ["ANTIGUO TESTAMENTO", "Antiguo"],
    ["NUEVO TESTAMENTO",   "Nuevo"],
  ] as const) {
    const testNotas = notas.filter((n) => n.libro.testamento === testKey);
    if (!testNotas.length) continue;

    checkBreak(14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(138, 138, 138);
    doc.text(testLabel, ML, y);
    y += 7;

    // Agrupar por libro
    const libroMap = new Map<string, { libro: NotaDetalle["libro"]; notas: NotaDetalle[] }>();
    for (const n of testNotas) {
      if (!libroMap.has(n.abreviatura_libro))
        libroMap.set(n.abreviatura_libro, { libro: n.libro, notas: [] });
      libroMap.get(n.abreviatura_libro)!.notas.push(n);
    }
    const libroGroups = Array.from(libroMap.values()).sort((a, b) => a.libro.orden - b.libro.orden);

    for (const { libro, notas: lNotas } of libroGroups) {
      checkBreak(14);
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(44, 44, 44);
      doc.text(libro.nombre, ML, y);
      y += 7;

      for (const nota of lNotas) {
        const rango = nota.versiculo_fin > nota.versiculo_inicio
          ? `${nota.capitulo}:${nota.versiculo_inicio}\u2013${nota.versiculo_fin}`
          : `${nota.capitulo}:${nota.versiculo_inicio}`;

        // Calcular altura antes de dibujar
        doc.setFont("times", "italic");
        doc.setFontSize(10);
        const versoLines: string[] = nota.versiculos_texto?.length
          ? doc.splitTextToSize(nota.versiculos_texto.join(" "), INNER_W)
          : [];

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const notaLines: string[] = doc.splitTextToSize(nota.texto, INNER_W);

        const hasSep = versoLines.length > 0;
        const boxH = 5                               // ref row
          + (versoLines.length > 0 ? versoLines.length * LINE_H + 3 : 0)
          + (hasSep ? 2 : 0)
          + notaLines.length * LINE_H
          + 7;                                        // padding top+bottom

        checkBreak(boxH + 3);

        const bgRgb  = hexRgb(NOTA_BG[nota.color]  ?? "#FEF9C3");
        const barRgb = hexRgb(NOTA_BAR[nota.color] ?? "#FDE047");
        const fgRgb  = hexRgb(NOTA_FG[nota.color]  ?? "#854D0E");

        // Fondo
        doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
        doc.roundedRect(ML, y, CW, boxH, 2, 2, "F");

        // Barra izquierda (encima del fondo)
        doc.setFillColor(barRgb[0], barRgb[1], barRgb[2]);
        doc.rect(ML, y, 3, boxH, "F");

        let iy = y + 5;

        // Referencia
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2]);
        doc.text(`${nota.abreviatura_libro} ${rango}`, INNER_X, iy);

        // Fecha (derecha)
        const fechaNota = formatFechaNota(nota.updated_at);
        if (fechaNota) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(160, 160, 160);
          const fw = doc.getTextWidth(fechaNota);
          doc.text(fechaNota, ML + CW - fw - 3, iy);
        }
        iy += 5.5;

        // Texto bíblico
        if (versoLines.length > 0) {
          doc.setFont("times", "italic");
          doc.setFontSize(10);
          doc.setTextColor(44, 44, 44);
          doc.text(versoLines, INNER_X, iy);
          iy += versoLines.length * LINE_H + 1;

          // Separador
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.2);
          doc.line(INNER_X, iy + 0.5, ML + CW - 3, iy + 0.5);
          iy += 3;
        }

        // Texto de nota
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(notaLines, INNER_X, iy);

        y += boxH + 3;
      }

      y += 3;
    }

    y += 3;
  }

  doc.save(`notas-biblicas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function NotasPage() {
  const [notas, setNotas] = useState<NotaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroColor, setFiltroColor] = useState<string | null>(null);
  const [menuExportar, setMenuExportar] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ notas: NotaDetalle[] }>("/api/notas/todos")
      .then((res) => setNotas(res.data.notas))
      .finally(() => setLoading(false));
  }, []);

  async function handleEliminar(id: number) {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiClient.delete(`/api/notas/${id}`);
    } catch {
      // rollback sería cargar de nuevo, pero es poco probable
    }
  }

  async function handleGuardar(id: number, texto: string, color: string) {
    setNotas((prev) =>
      prev.map((n) => (n.id === id ? { ...n, texto, color } : n))
    );
    await apiClient.put(`/api/notas/${id}`, { texto, color });
  }

  const notasFiltradas = filtroColor ? notas.filter((n) => n.color === filtroColor) : notas;
  const antiguo = agrupar(notasFiltradas.filter((n) => n.libro.testamento === "Antiguo"));
  const nuevo   = agrupar(notasFiltradas.filter((n) => n.libro.testamento === "Nuevo"));

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Encabezado */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Mis Notas</h1>
            {!loading && (
              <p className="font-inter text-sm text-[#8A8A8A] mt-1">
                {notas.length === 0
                  ? "Aún no tienes notas"
                  : filtroColor
                    ? `${notasFiltradas.length} de ${notas.length} nota${notas.length !== 1 ? "s" : ""}`
                    : `${notas.length} nota${notas.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>

          {/* Dropdown exportar */}
          {!loading && notas.length > 0 && (
            <div className="relative mt-1">
              <button
                onClick={() => setMenuExportar((v) => !v)}
                className="shrink-0 font-inter text-xs text-[#8A8A8A] hover:text-[#4A6FA5] border border-[#E8E4DF] hover:border-[#4A6FA5]/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Exportar
                <span className="text-[10px] opacity-60">▾</span>
              </button>
              {menuExportar && (
                <>
                  {/* Backdrop para cerrar */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuExportar(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#E8E4DF] rounded-xl shadow-lg py-1 min-w-[130px]">
                    <button
                      onClick={() => {
                        exportarNotas(notasFiltradas.length ? notasFiltradas : notas);
                        setMenuExportar(false);
                      }}
                      className="w-full text-left font-inter text-xs text-[#2C2C2C] hover:bg-[#F0EDE8] px-4 py-2.5 transition-colors"
                    >
                      Como .txt
                    </button>
                    <button
                      onClick={async () => {
                        setMenuExportar(false);
                        await exportarPDF(notasFiltradas.length ? notasFiltradas : notas);
                      }}
                      className="w-full text-left font-inter text-xs text-[#2C2C2C] hover:bg-[#F0EDE8] px-4 py-2.5 transition-colors"
                    >
                      Como PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Filtro por color */}
        {!loading && notas.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroColor(null)}
              className={`font-inter text-xs px-3 py-1 rounded-full border transition-colors ${
                filtroColor === null
                  ? "bg-[#4A6FA5] text-white border-[#4A6FA5]"
                  : "text-[#8A8A8A] border-[#E8E4DF] hover:border-[#4A6FA5]/50 hover:text-[#4A6FA5]"
              }`}
            >
              Todas
            </button>
            {COLORES_ORDEN.map((token) => {
              const tiene = notas.some((n) => n.color === token);
              if (!tiene) return null;
              const activo = filtroColor === token;
              return (
                <button
                  key={token}
                  onClick={() => setFiltroColor(activo ? null : token)}
                  className={`flex items-center gap-1.5 font-inter text-xs px-3 py-1 rounded-full border transition-colors ${
                    activo
                      ? "border-[#4A6FA5] text-[#4A6FA5] bg-[#4A6FA5]/8"
                      : "text-[#8A8A8A] border-[#E8E4DF] hover:border-[#4A6FA5]/50 hover:text-[#4A6FA5]"
                  }`}
                  title={token.charAt(0).toUpperCase() + token.slice(1)}
                >
                  <span
                    style={{ backgroundColor: COLORES_NOTA[token].swatch }}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                  />
                  {token.charAt(0).toUpperCase() + token.slice(1)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-[#E8E4DF] rounded-xl p-5 space-y-3">
              <div className="h-3 w-24 bg-[#E8E4DF] rounded animate-pulse" />
              <div className="h-4 w-full bg-[#E8E4DF] rounded animate-pulse" />
              <div className="h-4 w-3/5 bg-[#E8E4DF] rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Vacío */}
      {!loading && notas.length === 0 && (
        <div className="border border-[#E8E4DF] rounded-xl p-8 text-center">
          <p className="font-lora text-lg text-[#2C2C2C] mb-2">Sin notas todavía</p>
          <p className="font-inter text-sm text-[#8A8A8A]">
            Toca un versículo en cualquier página de lectura y elige «Anotar» para agregar una nota.
          </p>
        </div>
      )}

      {/* Contenido */}
      {!loading && notas.length > 0 && (
        <div className="space-y-10">
          {antiguo.length > 0 && (
            <TestamentoSection
              titulo="Antiguo Testamento"
              grupos={antiguo}
              onEliminar={handleEliminar}
              onGuardar={handleGuardar}
            />
          )}
          {nuevo.length > 0 && (
            <TestamentoSection
              titulo="Nuevo Testamento"
              grupos={nuevo}
              onEliminar={handleEliminar}
              onGuardar={handleGuardar}
            />
          )}
        </div>
      )}
    </main>
  );
}

/* ── Agrupación ─────────────────────────────────────────────── */

function agrupar(notas: NotaDetalle[]): Grupo[] {
  const map = new Map<string, Grupo>();
  for (const n of notas) {
    const key = n.abreviatura_libro;
    if (!map.has(key)) {
      map.set(key, { libro: n.libro, abreviatura: n.abreviatura_libro, notas: [] });
    }
    map.get(key)!.notas.push(n);
  }
  return Array.from(map.values()).sort((a, b) => a.libro.orden - b.libro.orden);
}

/* ── Sección testamento ─────────────────────────────────────── */

function TestamentoSection({
  titulo,
  grupos,
  onEliminar,
  onGuardar,
}: {
  titulo: string;
  grupos: Grupo[];
  onEliminar: (id: number) => void;
  onGuardar: (id: number, texto: string, color: string) => Promise<void>;
}) {
  return (
    <div>
      <h2 className="font-inter text-xs text-[#8A8A8A] uppercase tracking-widest mb-5">
        {titulo}
      </h2>
      <div className="space-y-8">
        {grupos.map((g) => (
          <div key={g.abreviatura}>
            <h3 className="font-lora text-base text-[#2C2C2C] mb-3 flex items-center gap-2">
              {g.libro.nombre}
              <span className="font-inter text-xs text-[#8A8A8A]">
                {g.notas.length} nota{g.notas.length !== 1 ? "s" : ""}
              </span>
            </h3>
            <div className="space-y-3">
              {g.notas.map((n) => (
                <NotaCard
                  key={n.id}
                  nota={n}
                  onEliminar={onEliminar}
                  onGuardar={onGuardar}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tarjeta de nota ────────────────────────────────────────── */

function NotaCard({
  nota,
  onEliminar,
  onGuardar,
}: {
  nota: NotaDetalle;
  onEliminar: (id: number) => void;
  onGuardar: (id: number, texto: string, color: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [editTexto, setEditTexto] = useState(nota.texto);
  const [editColor, setEditColor] = useState(nota.color);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const colores = COLORES_NOTA[nota.color] ?? COLORES_NOTA.amarillo;

  const rango =
    nota.versiculo_fin > nota.versiculo_inicio
      ? `${nota.capitulo}:${nota.versiculo_inicio}–${nota.versiculo_fin}`
      : `${nota.capitulo}:${nota.versiculo_inicio}`;

  async function guardar() {
    if (!editTexto.trim()) return;
    setGuardando(true);
    try {
      await onGuardar(nota.id, editTexto.trim(), editColor);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    setEliminando(true);
    onEliminar(nota.id);
  }

  if (editando) {
    const editColores = COLORES_NOTA[editColor] ?? COLORES_NOTA.amarillo;
    return (
      <div
        className="border border-[#E8E4DF] rounded-xl overflow-hidden"
        style={{ borderLeftWidth: 4, borderLeftColor: editColores.swatch }}
      >
        <div className="px-4 pt-4 pb-3" style={{ backgroundColor: editColores.bg }}>
          <p className="font-inter text-xs font-medium mb-3" style={{ color: editColores.fg }}>
            {nota.abreviatura_libro} {rango}
          </p>

          {/* Color selector */}
          <div className="flex items-center gap-2.5 mb-3">
            {COLORES_ORDEN.map((token) => (
              <button
                key={token}
                onClick={() => setEditColor(token)}
                style={{
                  backgroundColor: COLORES_NOTA[token].swatch,
                  outline: editColor === token ? "2px solid #4A6FA5" : "2px solid transparent",
                  outlineOffset: "2px",
                }}
                className="w-5 h-5 rounded-full hover:scale-110 transition-transform shrink-0"
                title={token.charAt(0).toUpperCase() + token.slice(1)}
              />
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={editTexto}
            onChange={(e) => setEditTexto(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                guardar();
              }
              if (e.key === "Escape") setEditando(false);
            }}
            autoFocus
            rows={4}
            className="font-inter text-sm text-[#2C2C2C] w-full resize-none border border-[#E8E4DF] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#4A6FA5] bg-white placeholder:text-[#C0BAB3] leading-6"
          />
          <p
            className="font-inter text-xs text-right tabular-nums mt-1"
            style={{ color: editTexto.length > 500 ? "#F87171" : "#C0BAB3" }}
          >
            {editTexto.length} caracteres
          </p>
        </div>

        {/* Footer edición */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#E8E4DF] bg-white">
          <button
            onClick={() => { setEditTexto(nota.texto); setEditColor(nota.color); setEditando(false); }}
            className="font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !editTexto.trim()}
            className="font-inter text-xs text-white bg-[#4A6FA5] hover:bg-[#3d5f8f] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border border-[#E8E4DF] rounded-xl px-4 py-3 flex items-start justify-between gap-3"
      style={{
        backgroundColor: colores.bg,
        borderLeftWidth: 4,
        borderLeftColor: colores.swatch,
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-inter text-xs font-medium mb-1.5" style={{ color: colores.fg }}>
          {nota.abreviatura_libro} {rango}
        </p>
        <p className="font-lora text-sm leading-7 text-[#2C2C2C] whitespace-pre-line">
          {nota.texto}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <button
          onClick={() => setEditando(true)}
          className="font-inter text-xs text-[#8A8A8A] hover:text-[#4A6FA5] transition-colors p-1"
          title="Editar nota"
        >
          ✎
        </button>
        <button
          onClick={eliminar}
          disabled={eliminando}
          className="font-inter text-xs text-[#8A8A8A] hover:text-red-400 transition-colors p-1 disabled:opacity-40"
          title="Eliminar nota"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
