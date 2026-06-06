import { useState, useCallback } from "react";
import apiClient from "@/lib/axios";

export interface Comentario {
  id: number;
  versiculo_inicio: number;
  versiculo_fin: number;
  titulo_capitulo: string;
  titulo_seccion: string;
  texto: string;
  autor: string;
}

export function useComentarios() {
  const [cache, setCache] = useState<Record<string, Comentario[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const cargar = useCallback(async (abreviatura: string, capitulo: number) => {
    const clave = `${abreviatura}_${capitulo}`;
    if (cache[clave] !== undefined || loading.has(clave)) return;

    setLoading((prev) => new Set(prev).add(clave));
    try {
      const res = await apiClient.get<{ comentarios: Comentario[] }>(
        `/api/comentarios?libro=${encodeURIComponent(abreviatura)}&capitulo=${capitulo}`
      );
      setCache((prev) => ({ ...prev, [clave]: res.data.comentarios }));
    } catch {
      // Si falla, guardamos array vacío para no reintentar
      setCache((prev) => ({ ...prev, [clave]: [] }));
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(clave);
        return next;
      });
    }
  }, [cache, loading]);

  const obtener = useCallback(
    (abreviatura: string, capitulo: number): Comentario[] => {
      return cache[`${abreviatura}_${capitulo}`] ?? [];
    },
    [cache]
  );

  // Dado un versículo y la lista de versículos anteriores del mismo render,
  // devuelve el comentario si corresponde mostrar el ícono en este versículo.
  const comentarioPara = useCallback(
    (
      abreviatura: string,
      capitulo: number,
      versiculoNumero: number,
      versiculosAnterioresEnRango: number[]
    ): Comentario | null => {
      const comentarios = cache[`${abreviatura}_${capitulo}`] ?? [];
      const comentario = comentarios.find(
        (c) => c.versiculo_inicio <= versiculoNumero && versiculoNumero <= c.versiculo_fin
      );
      if (!comentario) return null;

      // Solo mostrar en el primer versículo visible del rango
      const hayAnterior = versiculosAnterioresEnRango.some(
        (n) => n >= comentario.versiculo_inicio && n < versiculoNumero
      );
      return hayAnterior ? null : comentario;
    },
    [cache]
  );

  return { cargar, obtener, comentarioPara };
}
