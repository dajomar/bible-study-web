export interface Libro {
  id: number;
  orden: number;
  nombre: string;
  abreviatura: string;
  testamento: "AT" | "NT";
}

export interface Capitulo {
  id: number;
  id_libro: number;
  numero: number;
}

export interface Versiculo {
  id: number;
  id_capitulo: number;
  numero: number;
  texto: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}

export interface Plan {
  id: number;
  id_usuario: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface Sesion {
  id: number;
  id_plan: number;
  orden: number;
  versiculo_inicio_id: number;
  versiculo_fin_id: number;
  fecha_programada: string;
  completada: boolean;
}

export interface Analisis {
  id: number;
  id_sesion: number;
  contexto_historico: string;
  resumen: string;
  temas_principales: string[];
  conexiones: string;
  preguntas_reflexion: string[];
  modelo_usado: string;
}

export interface Tarea {
  id: number;
  id_sesion: number;
  id_analisis: number;
  id_usuario: string;
  descripcion: string;
  origen: string;
  completada: boolean;
  notas: string;
}
