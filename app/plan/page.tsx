"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/axios";

interface Progreso { total: number; completadas: number; porcentaje: number }

interface Plan {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  progreso: Progreso;
}

interface CapInfo { numero: number; libro: { nombre: string } }
interface Sesion {
  id: number;
  orden: number;
  completada: boolean;
  fecha_programada: string | null;
  fecha_completada: string | null;
  inicio: { numero: number; capitulo: CapInfo };
  fin: { numero: number; capitulo: CapInfo };
}

interface PlanData { planes: Plan[]; sesiones: Sesion[] }

function buildRef(s: Sesion): string {
  const ini = s.inicio;
  const fin = s.fin;
  const mismoLibro = ini.capitulo.libro.nombre === fin.capitulo.libro.nombre;
  const mismoCap = ini.capitulo.numero === fin.capitulo.numero;
  if (mismoCap) return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero}–${fin.numero}`;
  if (mismoLibro) return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero} – ${fin.capitulo.numero}:${fin.numero}`;
  return `${ini.capitulo.libro.nombre} ${ini.capitulo.numero}:${ini.numero} – ${fin.capitulo.libro.nombre} ${fin.capitulo.numero}:${fin.numero}`;
}

export default function PlanPage() {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  async function cargar() {
    const res = await apiClient.get<PlanData>("/api/plan");
    setData(res.data);
  }

  useEffect(() => {
    cargar().finally(() => setLoading(false));
  }, []);

  async function handleActivar(planId: number) {
    await apiClient.put(`/api/plan/${planId}`, { activo: true });
    await cargar();
  }

  async function handleArchivar(planId: number) {
    await apiClient.put(`/api/plan/${planId}`, { activo: false });
    await cargar();
  }

  async function handleEliminar(planId: number) {
    await apiClient.delete(`/api/plan/${planId}`);
    await cargar();
  }

  function handlePlanCreado() {
    setMostrarFormulario(false);
    cargar();
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  const planActivo = data.planes.find((p) => p.activo);
  const otrosPlanes = data.planes.filter((p) => !p.activo);

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 mb-8 md:mb-10">
        <div>
          <h1 className="font-lora text-2xl md:text-3xl text-[#2C2C2C]">Plan de estudios</h1>
          <p className="font-inter text-sm text-[#8A8A8A] mt-1">
            {data.planes.length === 0 ? "Sin planes todavía" : `${data.planes.length} plan${data.planes.length !== 1 ? "es" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/plan/templates"
            className="shrink-0 border border-[#4A6FA5] text-[#4A6FA5] font-inter text-sm px-4 py-2.5 rounded-lg hover:bg-[#F0EDE8] transition-colors"
          >
            Ver plantillas
          </Link>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="shrink-0 bg-[#4A6FA5] text-white font-inter text-sm px-4 py-2.5 rounded-lg hover:bg-[#3d5f8f] transition-colors"
          >
            Nuevo plan
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <NuevoPlanForm onCreado={handlePlanCreado} onCancelar={() => setMostrarFormulario(false)} />
      )}

      {planActivo && (
        <section className="mb-8 md:mb-10">
          <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-3">Plan activo</p>
          <PlanCard
            plan={planActivo}
            activo
            sesiones={data.sesiones}
            onArchivar={() => handleArchivar(planActivo.id)}
            onEliminar={() => handleEliminar(planActivo.id)}
          />
        </section>
      )}

      {data.planes.length === 0 && !mostrarFormulario && (
        <div className="border border-[#E8E4DF] rounded-xl p-6 md:p-8 text-center">
          <p className="font-lora text-lg text-[#2C2C2C] mb-2">Sin planes todavía</p>
          <p className="font-inter text-sm text-[#8A8A8A]">Crea un plan para comenzar tu estudio.</p>
        </div>
      )}

      {otrosPlanes.length > 0 && (
        <section>
          <p className="font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-3">Otros planes</p>
          <div className="space-y-3">
            {otrosPlanes.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                activo={false}
                sesiones={[]}
                onActivar={() => handleActivar(p.id)}
                onEliminar={() => handleEliminar(p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function PlanCard({
  plan, activo, sesiones, onActivar, onArchivar, onEliminar,
}: {
  plan: Plan; activo: boolean; sesiones: Sesion[];
  onActivar?: () => void;
  onArchivar?: () => void;
  onEliminar: () => void;
}) {
  const [expandido, setExpandido] = useState(activo);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const { progreso } = plan;

  const librosTotal = Array.from(new Set(sesiones.map((s) => s.inicio.capitulo.libro.nombre)));
  const librosEstudiados = Array.from(new Set(
    sesiones.filter((s) => s.completada).map((s) => s.inicio.capitulo.libro.nombre)
  ));

  return (
    <div className="border border-[#E8E4DF] rounded-xl overflow-hidden">
      <div className="px-4 md:px-6 py-5">
        {/* Nombre + badge activo */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-lora text-lg text-[#2C2C2C]">{plan.nombre}</p>
          {activo && (
            <span className="font-inter text-xs bg-[#4A6FA5] text-white px-2 py-0.5 rounded-full">
              activo
            </span>
          )}
        </div>

        {plan.descripcion && (
          <p className="font-inter text-sm text-[#8A8A8A] mb-3">{plan.descripcion}</p>
        )}

        {/* Barra de progreso */}
        {progreso.total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="font-inter text-xs text-[#8A8A8A]">
                {progreso.completadas} / {progreso.total} sesiones
              </span>
              <span className="font-inter text-xs text-[#4A6FA5] font-medium">
                {progreso.porcentaje}%
              </span>
            </div>
            <div className="h-1.5 bg-[#E8E4DF] rounded-full overflow-hidden">
              <div className="h-full bg-[#4A6FA5] rounded-full" style={{ width: `${progreso.porcentaje}%` }} />
            </div>
          </div>
        )}

        {/* Libros estudiados — solo cuando hay sesiones cargadas */}
        {librosTotal.length > 0 && (
          <p className="font-inter text-xs text-[#8A8A8A] mb-3">
            {librosEstudiados.length > 0
              ? `${librosEstudiados.length} de ${librosTotal.length} libro${librosTotal.length !== 1 ? "s" : ""} estudiado${librosEstudiados.length !== 1 ? "s" : ""}`
              : `${librosTotal.length} libro${librosTotal.length !== 1 ? "s" : ""} en el plan`
            }
          </p>
        )}

        {progreso.total === 0 && (
          <p className="font-inter text-xs text-[#8A8A8A] mb-3">Sin sesiones — el agente las generará</p>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3 flex-wrap">
          {!activo && onActivar && (
            <button
              onClick={onActivar}
              className="font-inter text-xs text-[#4A6FA5] border border-[#4A6FA5] px-3 py-1.5 rounded-lg hover:bg-[#4A6FA5] hover:text-white transition-colors"
            >
              Activar
            </button>
          )}
          {activo && onArchivar && (
            <button
              onClick={onArchivar}
              className="font-inter text-xs text-[#8A8A8A] border border-[#E8E4DF] px-3 py-1.5 rounded-lg hover:border-[#8A8A8A] transition-colors"
            >
              Archivar
            </button>
          )}
          {sesiones.length > 0 && (
            <button
              onClick={() => setExpandido((v) => !v)}
              className="font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors"
            >
              {expandido ? "Ocultar sesiones" : "Ver sesiones"}
            </button>
          )}
          <div className="ml-auto">
            {confirmandoEliminar ? (
              <div className="flex items-center gap-2">
                <span className="font-inter text-xs text-[#8A8A8A]">¿Eliminar plan y todo su historial?</span>
                <button
                  onClick={onEliminar}
                  className="font-inter text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setConfirmandoEliminar(false)}
                  className="font-inter text-xs text-[#8A8A8A] hover:text-[#2C2C2C] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoEliminar(true)}
                className="font-inter text-xs text-[#8A8A8A] hover:text-red-400 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {expandido && sesiones.length > 0 && (
        <div className="border-t border-[#E8E4DF]">
          <div className="max-h-72 overflow-y-auto">
            {sesiones.map((s) => (
              <SesionRow key={s.id} sesion={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SesionRow({ sesion }: { sesion: Sesion }) {
  const ref = buildRef(sesion);
  return (
    <div className={`flex items-start gap-3 px-4 md:px-6 py-3 border-b border-[#E8E4DF] last:border-0 ${sesion.completada ? "opacity-50" : ""}`}>
      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sesion.completada ? "bg-[#4A6FA5]" : "bg-[#E8E4DF] border border-[#8A8A8A]"}`} />

      <div className="flex-1 min-w-0">
        <span className="font-inter text-xs text-[#8A8A8A] mr-2">Día {sesion.orden}</span>
        <span className="font-inter text-sm text-[#2C2C2C] break-words">{ref}</span>
      </div>

      <div className="shrink-0 text-right">
        {sesion.fecha_programada && (
          <p className="font-inter text-xs text-[#8A8A8A]">
            {new Date(sesion.fecha_programada + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
          </p>
        )}
        {sesion.completada && <p className="font-inter text-xs text-[#4A6FA5]">✓</p>}
      </div>
    </div>
  );
}

function NuevoPlanForm({ onCreado, onCancelar }: { onCreado: () => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/api/plan", { nombre, descripcion });
      onCreado();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Error al crear el plan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-[#4A6FA5] rounded-xl p-5 md:p-6 mb-8">
      <p className="font-lora text-lg text-[#2C2C2C] mb-5">Nuevo plan</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Plan cronológico 2025"
            required
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors"
          />
        </div>
        <div>
          <label className="block font-inter text-xs text-[#8A8A8A] uppercase tracking-wide mb-1.5">
            Descripción <span className="normal-case">(opcional)</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción del plan..."
            rows={2}
            className="w-full border border-[#E8E4DF] rounded-lg px-4 py-3 font-inter text-sm text-[#2C2C2C] bg-[#FAF8F5] outline-none focus:border-[#4A6FA5] transition-colors resize-none"
          />
        </div>
        {error && <p className="font-inter text-sm text-red-500">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-[#4A6FA5] text-white font-inter text-sm px-5 py-3 rounded-lg hover:bg-[#3d5f8f] transition-colors disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear plan"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="w-full sm:w-auto font-inter text-sm text-[#8A8A8A] hover:text-[#2C2C2C] py-3 transition-colors text-center"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-[#E8E4DF] rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-[#E8E4DF] rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-[#E8E4DF] rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-[#E8E4DF] rounded-xl p-5">
            <div className="h-5 w-48 bg-[#E8E4DF] rounded animate-pulse mb-3" />
            <div className="h-1.5 bg-[#E8E4DF] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
