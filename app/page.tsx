"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/axios";

interface SesionHoy {
  id: number;
  orden: number;
  completada: boolean;
  fecha_programada: string;
  inicio: {
    numero: number;
    capitulo: { numero: number; libro: { nombre: string; abreviatura: string } };
  };
  fin: {
    numero: number;
    capitulo: { numero: number; libro: { nombre: string; abreviatura: string } };
  };
}

interface Tarea {
  id: number;
  descripcion: string;
  origen: "llama" | "usuario";
  created_at: string;
}

interface DashboardData {
  plan: { id: number; nombre: string } | null;
  sesionHoy: SesionHoy | null;
  progreso: { total: number; completadas: number; porcentaje: number } | null;
  tareasHoy: Tarea[];
}

function referenciaBiblica(sesion: SesionHoy): string {
  const ini = sesion.inicio;
  const fin = sesion.fin;
  const mismoLibro = ini.capitulo.libro.nombre === fin.capitulo.libro.nombre;
  const mismoCapitulo = ini.capitulo.numero === fin.capitulo.numero;

  if (mismoCapitulo) {
    return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero}–${fin.numero}`;
  }
  if (mismoLibro) {
    return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero} – ${fin.capitulo.numero}:${fin.numero}`;
  }
  return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero} – ${fin.capitulo.libro.nombre} ${fin.capitulo.numero}:${fin.numero}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<DashboardData>("/api/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("No se pudo cargar el dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <p className="font-inter text-sm text-[#8A8A8A] capitalize mb-1">{hoy}</p>
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Buenos días</h1>
      </div>

      {!data.plan && <SinPlan />}

      {data.plan && (
        <div className="space-y-4 md:space-y-6">
          <SesionCard sesion={data.sesionHoy} planNombre={data.plan.nombre} />
          {data.progreso && <ProgresoCard progreso={data.progreso} planNombre={data.plan.nombre} />}
          {data.tareasHoy.length > 0 && <TareasCard tareas={data.tareasHoy} />}
        </div>
      )}
    </main>
  );
}

function SinPlan() {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-6 md:p-8 text-center">
      <p className="font-lora text-lg text-[#2C2C2C] mb-2">No tienes un plan activo</p>
      <p className="font-inter text-sm text-[#8A8A8A] mb-6">
        Crea un plan de lectura para comenzar tu estudio.
      </p>
      <Link
        href="/plan"
        className="inline-block bg-[#4A6FA5] text-white font-inter text-sm px-5 py-2.5 rounded-lg hover:bg-[#3d5f8f] transition-colors"
      >
        Crear plan
      </Link>
    </div>
  );
}

function SesionCard({ sesion, planNombre }: { sesion: SesionHoy | null; planNombre: string }) {
  if (!sesion) {
    return (
      <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1">
          Sesión de hoy · {planNombre}
        </p>
        <p className="font-inter text-sm text-[#8A8A8A]">No hay sesión programada para hoy.</p>
      </div>
    );
  }

  const ref = referenciaBiblica(sesion);

  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-2">
        Sesión de hoy · {planNombre}
      </p>
      <p className="font-lora text-xl text-[#2C2C2C] mb-1">{ref}</p>
      <p className="font-inter text-sm text-[#8A8A8A] mb-4">
        Día {sesion.orden}{sesion.completada && " · Completada"}
      </p>

      {!sesion.completada && (
        <Link
          href="/estudio"
          className="inline-block w-full md:w-auto text-center bg-[#4A6FA5] text-white font-inter text-sm px-5 py-2.5 rounded-lg hover:bg-[#3d5f8f] transition-colors"
        >
          Ir al estudio
        </Link>
      )}

      {sesion.completada && (
        <span className="inline-block bg-[#FAF8F5] border border-[#E8E4DF] text-[#8A8A8A] font-inter text-xs px-3 py-1.5 rounded-lg">
          ✓ Completada
        </span>
      )}
    </div>
  );
}

function ProgresoCard({
  progreso,
  planNombre,
}: {
  progreso: { total: number; completadas: number; porcentaje: number };
  planNombre: string;
}) {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">{planNombre}</p>
        <p className="font-inter text-sm font-medium text-[#4A6FA5]">{progreso.porcentaje}%</p>
      </div>
      <div className="h-1.5 bg-[#E8E4DF] rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[#4A6FA5] rounded-full transition-all"
          style={{ width: `${progreso.porcentaje}%` }}
        />
      </div>
      <p className="font-inter text-sm text-[#8A8A8A]">
        {progreso.completadas} de {progreso.total} sesiones completadas
      </p>
    </div>
  );
}

function TareasCard({ tareas }: { tareas: Tarea[] }) {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">Tareas pendientes</p>
        <span className="font-inter text-xs bg-[#FAF8F5] border border-[#E8E4DF] text-[#8A8A8A] px-2 py-0.5 rounded-full">
          {tareas.length}
        </span>
      </div>
      <ul className="space-y-3">
        {tareas.map((t) => (
          <li key={t.id} className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4A6FA5] shrink-0" />
            <div>
              <p className="font-inter text-sm text-[#2C2C2C]">{t.descripcion}</p>
              <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">
                {t.origen === "llama" ? "Generada por IA" : "Creada por ti"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="h-3 w-32 bg-[#E8E4DF] rounded mb-2 animate-pulse" />
        <div className="h-8 w-48 bg-[#E8E4DF] rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
            <div className="h-3 w-24 bg-[#E8E4DF] rounded mb-3 animate-pulse" />
            <div className="h-5 w-56 bg-[#E8E4DF] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="font-inter text-sm text-red-500">{msg}</p>
    </main>
  );
}
