import { useState, useCallback } from "react";
import apiClient from "@/lib/axios";

export interface Nota {
  id: number;
  id_usuario: string;
  abreviatura_libro: string;
  capitulo: number;
  versiculo_inicio: number;
  versiculo_fin: number;
  texto: string;
  color: string;
  updated_at: string;
}

export function useNotas() {
  const [cache, setCache] = useState<Record<string, Nota[]>>({});
  const [cargando, setCargando] = useState<Set<string>>(new Set());

  const cargar = useCallback(async (abreviatura: string, capitulo: number) => {
    const key = `${abreviatura}_${capitulo}`;
    if (cache[key] !== undefined || cargando.has(key)) return;
    setCargando((prev) => new Set(prev).add(key));
    try {
      const res = await apiClient.get<{ notas: Nota[] }>(
        `/api/notas?libro=${encodeURIComponent(abreviatura)}&capitulo=${capitulo}`
      );
      setCache((prev) => ({ ...prev, [key]: res.data.notas }));
    } catch {
      setCache((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setCargando((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [cache, cargando]);

  /** Nota que *empieza* exactamente en este versículo. */
  const notaPara = useCallback(
    (abreviatura: string, capitulo: number, versiculoNum: number): Nota | null => {
      return (
        (cache[`${abreviatura}_${capitulo}`] ?? []).find(
          (n) => n.versiculo_inicio === versiculoNum
        ) ?? null
      );
    },
    [cache]
  );

  /** Crea o actualiza via upsert (POST). */
  const guardar = useCallback(async (datos: {
    abreviatura_libro: string;
    capitulo: number;
    versiculo_inicio: number;
    versiculo_fin: number;
    texto: string;
    color: string;
  }) => {
    const key = `${datos.abreviatura_libro}_${datos.capitulo}`;
    try {
      const res = await apiClient.post<{ nota: Nota }>("/api/notas", datos);
      setCache((prev) => ({
        ...prev,
        [key]: [
          ...(prev[key] ?? []).filter((n) => n.versiculo_inicio !== datos.versiculo_inicio),
          res.data.nota,
        ],
      }));
    } catch {}
  }, []);

  /** Elimina una nota con rollback optimista. */
  const eliminar = useCallback(async (nota: Nota) => {
    const key = `${nota.abreviatura_libro}_${nota.capitulo}`;
    setCache((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((n) => n.id !== nota.id),
    }));
    try {
      await apiClient.delete(`/api/notas/${nota.id}`);
    } catch {
      setCache((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []), nota],
      }));
    }
  }, []);

  return { cargar, notaPara, guardar, eliminar };
}
