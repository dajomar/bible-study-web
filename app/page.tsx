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

interface PlanActivo {
  id: number;
  nombre: string;
  sesionHoy: SesionHoy | null;
  progreso: { total: number; completadas: number; porcentaje: number };
}

interface OtroPlan {
  id: number;
  nombre: string;
  progreso: { total: number; completadas: number; porcentaje: number };
}

interface DashboardData {
  planesActivos: PlanActivo[];
  tareasHoy: Tarea[];
  otrosPlanes: OtroPlan[];
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

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
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
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Encabezado */}
      <div className="mb-8 md:mb-10">
        <p className="font-inter text-sm text-[#8A8A8A] capitalize mb-1">{hoy}</p>
        <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">{saludo()}</h1>
      </div>

      {data.planesActivos.length === 0 && (
        <SinPlan tienePlanes={data.otrosPlanes.length > 0} />
      )}

      {data.planesActivos.length > 0 && (
        <div className="space-y-6 md:space-y-8">
          {data.planesActivos.map((plan) => (
            <div key={plan.id} className="space-y-4 md:space-y-5">
              <SesionCard sesion={plan.sesionHoy} planNombre={plan.nombre} />
              <ProgresoCard progreso={plan.progreso} planNombre={plan.nombre} />
            </div>
          ))}

          {data.tareasHoy.length > 0 && <TareasCard tareas={data.tareasHoy} />}
          {data.otrosPlanes.length > 0 && <OtrosPlanesCard planes={data.otrosPlanes} />}
        </div>
      )}
    </main>
  );
}

/* ── Sin plan ───────────────────────────────────────────────── */

function SinPlan({ tienePlanes }: { tienePlanes: boolean }) {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-8 md:p-10 text-center">
      <p className="font-lora text-xl text-[#2C2C2C] mb-2">No tienes un plan activo</p>
      <p className="font-inter text-sm text-[#8A8A8A] mb-6 max-w-xs mx-auto">
        {tienePlanes
          ? "Tienes planes archivados. Activa uno para continuar tu estudio."
          : "Crea un plan de lectura para comenzar tu estudio bíblico."}
      </p>
      <Link
        href="/plan"
        className="inline-block bg-[#4A6FA5] text-white font-inter text-sm px-6 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors"
      >
        {tienePlanes ? "Ir a mis planes" : "Crear plan"}
      </Link>
    </div>
  );
}

/* ── Sesión ─────────────────────────────────────────────────── */

function SesionCard({ sesion, planNombre }: { sesion: SesionHoy | null; planNombre: string }) {
  if (!sesion) {
    return (
      <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-3">
          Sesión de hoy · {planNombre}
        </p>
        <p className="font-inter text-sm text-[#8A8A8A]">No hay sesión programada para hoy.</p>
      </div>
    );
  }

  const ref = referenciaBiblica(sesion);

  return (
    <div className={`rounded-xl overflow-hidden border ${sesion.completada ? "border-[#E8E4DF]" : "border-[#4A6FA5]/30"}`}>
      {!sesion.completada && <div className="h-1 bg-[#4A6FA5]" />}

      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">
            {planNombre} · Día {sesion.orden}
          </p>
          {sesion.completada && (
            <span className="font-inter text-xs text-[#4A6FA5] shrink-0">✓ Completada</span>
          )}
        </div>

        <p className="font-lora text-2xl md:text-3xl text-[#2C2C2C] mb-5 leading-snug">{ref}</p>

        {!sesion.completada && (
          <Link
            href="/estudio"
            className="inline-block w-full md:w-auto text-center bg-[#4A6FA5] text-white font-inter text-sm font-medium px-6 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors"
          >
            Comenzar sesión →
          </Link>
        )}
        {sesion.completada && (
          <Link
            href={`/analisis?sesion=${sesion.id}`}
            className="inline-block font-inter text-sm text-[#4A6FA5] hover:text-[#3d5f8f] transition-colors"
          >
            Ver análisis →
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Progreso ───────────────────────────────────────────────── */

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
        <p className="font-lora text-lg text-[#4A6FA5]">{progreso.porcentaje}%</p>
      </div>

      <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[#4A6FA5] rounded-full transition-all duration-700"
          style={{ width: `${progreso.porcentaje}%` }}
        />
      </div>

      <div className="flex items-center gap-6">
        <div>
          <p className="font-lora text-xl text-[#2C2C2C]">{progreso.completadas}</p>
          <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">completadas</p>
        </div>
        <div className="w-px h-8 bg-[#E8E4DF]" />
        <div>
          <p className="font-lora text-xl text-[#2C2C2C]">{progreso.total - progreso.completadas}</p>
          <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">restantes</p>
        </div>
        <div className="w-px h-8 bg-[#E8E4DF]" />
        <div>
          <p className="font-lora text-xl text-[#2C2C2C]">{progreso.total}</p>
          <p className="font-inter text-xs text-[#8A8A8A] mt-0.5">total</p>
        </div>
      </div>
    </div>
  );
}

/* ── Tareas ─────────────────────────────────────────────────── */

function TareasCard({ tareas }: { tareas: Tarea[] }) {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">Tareas pendientes</p>
        <span className="font-inter text-xs bg-[#FAF8F5] border border-[#E8E4DF] text-[#8A8A8A] px-2 py-0.5 rounded-full">
          {tareas.length}
        </span>
      </div>

      <ul className="space-y-4">
        {tareas.map((t) => (
          <li key={t.id} className="flex items-start gap-3">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#4A6FA5] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-inter text-sm text-[#2C2C2C] leading-6">{t.descripcion}</p>
              <span className={`inline-block mt-1 font-inter text-xs px-2 py-0.5 rounded-full ${
                t.origen === "llama"
                  ? "bg-[#FAF8F5] text-[#8A8A8A] border border-[#E8E4DF]"
                  : "bg-[#4A6FA5]/8 text-[#4A6FA5] border border-[#4A6FA5]/20"
              }`}>
                {t.origen === "llama" ? "IA" : "Tuya"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Otros planes ───────────────────────────────────────────── */

function OtrosPlanesCard({ planes }: { planes: OtroPlan[] }) {
  return (
    <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide">Otros planes</p>
        <Link href="/plan" className="font-inter text-xs text-[#4A6FA5] hover:text-[#3d5f8f] transition-colors">
          Gestionar →
        </Link>
      </div>
      <div className="space-y-4">
        {planes.map((p) => (
          <div key={p.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-inter text-sm text-[#2C2C2C]">{p.nombre}</span>
              <span className="font-inter text-xs text-[#8A8A8A]">
                {p.progreso.completadas}/{p.progreso.total} · {p.progreso.porcentaje}%
              </span>
            </div>
            <div className="h-1 bg-[#E8E4DF] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p.progreso.porcentaje}%`, backgroundColor: "#CBD5E1" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="h-3 w-32 bg-[#E8E4DF] rounded mb-2 animate-pulse" />
        <div className="h-8 w-48 bg-[#E8E4DF] rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="border border-[#E8E4DF] rounded-xl overflow-hidden">
          <div className="h-1 bg-[#E8E4DF]" />
          <div className="p-5 md:p-6">
            <div className="h-3 w-32 bg-[#E8E4DF] rounded mb-4 animate-pulse" />
            <div className="h-8 w-64 bg-[#E8E4DF] rounded mb-6 animate-pulse" />
            <div className="h-11 w-40 bg-[#E8E4DF] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="border border-[#E8E4DF] rounded-xl p-5 md:p-6">
          <div className="h-3 w-24 bg-[#E8E4DF] rounded mb-4 animate-pulse" />
          <div className="h-2 bg-[#E8E4DF] rounded-full mb-4 animate-pulse" />
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-6 w-8 bg-[#E8E4DF] rounded mb-1 animate-pulse" />
                <div className="h-3 w-16 bg-[#E8E4DF] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="font-inter text-sm text-red-500">{msg}</p>
    </main>
  );
}
