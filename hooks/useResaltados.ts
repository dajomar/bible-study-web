import { useState } from "react";
import apiClient from "@/lib/axios";

export function useResaltados() {
  const [resaltados, setResaltados] = useState<Record<number, string>>({});

  /** Carga resaltados para los IDs dados y los fusiona al estado existente. */
  async function cargar(ids: number[]) {
    if (!ids.length) return;
    try {
      const res = await apiClient.get<{ resaltados: { id_versiculo: number; color: string }[] }>(
        `/api/resaltados?versiculos=${ids.join(",")}`
      );
      const nuevos: Record<number, string> = Object.fromEntries(
        res.data.resaltados.map((r) => [r.id_versiculo, r.color])
      );
      setResaltados((prev) => ({ ...prev, ...nuevos }));
    } catch {
      // sin acceso o tabla no existe → ignorar silenciosamente
    }
  }

  /** Guarda un resaltado (optimista). */
  async function guardar(versiculoId: number, color: string) {
    setResaltados((prev) => ({ ...prev, [versiculoId]: color }));
    try {
      await apiClient.post("/api/resaltados", { id_versiculo: versiculoId, color });
    } catch {
      // rollback
      setResaltados((prev) => { const n = { ...prev }; delete n[versiculoId]; return n; });
    }
  }

  /** Elimina un resaltado (optimista). */
  async function quitar(versiculoId: number) {
    const colorPrev = resaltados[versiculoId];
    setResaltados((prev) => { const n = { ...prev }; delete n[versiculoId]; return n; });
    try {
      await apiClient.delete(`/api/resaltados/${versiculoId}`);
    } catch {
      if (colorPrev) setResaltados((prev) => ({ ...prev, [versiculoId]: colorPrev }));
    }
  }

  return { resaltados, cargar, guardar, quitar };
}
