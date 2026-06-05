# bible-study-web

## Contexto del proyecto

Frontend y backend web del sistema de estudio bíblico. Consume la misma base de datos Supabase que `bible-study-agents`. Construido con Next.js 14 usando App Router.

Los scripts SQL en `/database` son la fuente de verdad del esquema real de la BD.

La plataforma es multiusuario: cada usuario tiene sus propios planes, sesiones y tareas. La autenticación es prerequisito de todo lo demás.

La lógica de negocio vive en Route Handlers (`app/api/`). El frontend son Client Components que consumen esos endpoints via Axios. Supabase nunca se toca desde el cliente.

Proyecto hermano: `bible-study-agents` (agentes Python que analizan con Llama 3.1 y notifican por Slack).

---

## Stack

| Componente        | Tecnología                              |
|-------------------|-----------------------------------------|
| Framework         | Next.js 14 (App Router)                 |
| Lenguaje          | TypeScript                              |
| Cliente HTTP      | Axios                                   |
| Base de datos     | Supabase (compartida con agents)        |
| Auth              | Supabase Auth + `@supabase/ssr`         |
| Estilos           | Tailwind CSS                            |
| Tipografía        | Lora (serif, texto bíblico) + Inter (UI)|
| Deploy            | Vercel                                  |

---

## Reglas de arquitectura — CRÍTICAS

1. **Supabase NUNCA se llama desde el cliente.** Solo desde Route Handlers.
2. **`SUPABASE_SERVICE_ROLE_KEY`** solo existe en variables de entorno del servidor — nunca en `NEXT_PUBLIC_`.
3. **Toda la lógica de negocio** vive en Route Handlers (`app/api/`) — lecturas y mutaciones.
4. **El frontend son Client Components** que consumen los Route Handlers via **Axios**.
5. **Sin Server Actions, sin Server Components que llamen a Supabase directamente.**
6. **Axios** es el único cliente HTTP permitido en el frontend — nunca `fetch` directo a Supabase.

### Flujo de datos
```
Client Components (Axios)
        ↓
Route Handlers (app/api/...)   ← backend interno
        ↓
Supabase (server only)
```

---

## Diseño UI — Dirección visual

**Sensación:** Minimalista, contemplativa, tranquila. Como leer un libro.

**Paleta de colores:**
```
Fondo principal:   #FAF8F5  (blanco roto / crema)
Texto principal:   #2C2C2C  (carbón suave)
Acento:            #4A6FA5  (azul pizarra — sobrio)
Texto secundario:  #8A8A8A  (gris cálido)
Bordes:            #E8E4DF  (gris crema)
```

**Tipografía:**
- Texto bíblico y títulos principales → `Lora` (serif, Google Fonts)
- Navegación, etiquetas, UI → `Inter` (sans-serif, Google Fonts)

**Principios:**
- Mucho espacio en blanco — no saturar la pantalla
- Radios suaves (rounded-lg, rounded-xl)
- Sombras casi imperceptibles (shadow-sm)
- Sin animaciones llamativas
- Priorizar el texto sobre los elementos decorativos

---

## Estructura de carpetas

```
bible-study-web/
├── app/
│   ├── layout.tsx                  # Layout raíz con fuentes y nav
│   ├── page.tsx                    # Dashboard / overview (ruta /)
│   ├── login/
│   │   └── page.tsx                # Login / registro
│   ├── estudio/
│   │   └── page.tsx                # Estudio del día (texto + análisis)
│   ├── biblia/
│   │   └── page.tsx                # Lector de Biblia (buscar por libro)
│   ├── analisis/
│   │   └── page.tsx                # Análisis libre (fuera del plan)
│   ├── plan/
│   │   └── page.tsx                # Gestión del plan de estudios
│   ├── configuracion/
│   │   └── page.tsx                # Configuración de usuario
│   └── api/                        # Route Handlers — backend interno
│       ├── auth/
│       │   ├── login/route.ts      # POST — inicia sesión
│       │   ├── registro/route.ts   # POST — crea usuario
│       │   └── logout/route.ts     # POST — cierra sesión
│       ├── dashboard/route.ts      # GET — resumen del día
│       ├── estudio/route.ts        # GET — sesión activa + versículos + análisis
│       ├── biblia/route.ts         # GET — versículos por libro/capítulo
│       ├── analisis/route.ts       # GET/POST — análisis libres
│       ├── plan/route.ts           # GET/POST/PUT — planes y sesiones
│       └── usuario/route.ts        # GET/PUT — perfil del usuario
├── components/
│   ├── ui/                         # Button, Card, Badge, Input, Nav
│   └── [feature]/                  # Componentes por sección
├── lib/
│   ├── supabase.ts                 # Cliente con service role — SERVER ONLY
│   ├── supabase-auth.ts            # Cliente SSR para auth (cookies) — SERVER ONLY
│   ├── axios.ts                    # Instancia de Axios con baseURL configurada
│   └── utils.ts                    # Helpers generales
├── middleware.ts                   # Protege rutas autenticadas
├── types/
│   └── index.ts                    # Tipos TypeScript de todas las entidades
├── database/                       # Scripts SQL — fuente de verdad del esquema
├── CLAUDE.md
└── .env.local
```

---

## Variables de entorno (.env.local)

```
SUPABASE_URL=                       # URL del proyecto Supabase
SUPABASE_SERVICE_ROLE_KEY=          # NUNCA en NEXT_PUBLIC_
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## Base de datos — esquema real (de los scripts SQL)

```sql
-- Contenido bíblico (inmutable)
bible_libros      → id, orden, nombre, abreviatura, testamento, created_at
bible_capitulos   → id, id_libro, numero, created_at
bible_versiculos  → id, id_capitulo, numero, texto, created_at

-- Usuarios y planes
bible_usuarios    → id (UUID), email, nombre, created_at
bible_planes      → id, id_usuario, nombre, descripcion, activo, created_at
bible_sesiones    → id, id_plan, orden, versiculo_inicio_id, versiculo_fin_id,
                    fecha_programada, fecha_completada, completada, created_at

-- Análisis y tareas
bible_analisis    → id, id_sesion, contexto_historico, resumen, temas_principales (TEXT),
                    conexiones, preguntas_reflexion (TEXT), modelo_usado,
                    tokens_usados, duracion_segundos, created_at
bible_tareas      → id, id_sesion, id_analisis, id_usuario,
                    descripcion, origen ('llama'|'usuario'), completada, notas, created_at
```

**Notas importantes del esquema:**
- `temas_principales` y `preguntas_reflexion` son `TEXT` (no arrays) — el agente escribe texto libre
- `bible_usuarios.id` debe coincidir con el UID de Supabase Auth para vincular auth ↔ datos
- `bible_tareas.origen` tiene CHECK constraint: solo `'llama'` o `'usuario'`

---

## Plan de desarrollo — orden y estado

### Fase 0 — Autenticación ✅ PRIORITARIA
**Por qué primero:** todo lo demás depende del usuario autenticado.

- [ ] Instalar `@supabase/ssr`
- [ ] Crear `lib/supabase-auth.ts` — cliente SSR con cookies
- [ ] Crear `middleware.ts` — redirige a `/login` si no hay sesión
- [ ] Route Handlers: `POST /api/auth/login`, `POST /api/auth/registro`, `POST /api/auth/logout`
- [ ] Al registrarse: crear fila en `bible_usuarios` con el mismo UUID de Supabase Auth
- [ ] Página `/login` — formulario email/password, Client Component con Axios

### Fase 1 — Layout y navegación compartida ✅ COMPLETADA
- [x] Componente `Nav` — enlaces a las 6 secciones, indicador de sección activa
- [x] `app/layout.tsx` — integrar Nav
- [x] Fuentes Lora + Inter configuradas

### Fase 2 — Dashboard (`/`) ✅ COMPLETADA
- [x] `GET /api/dashboard` → sesión del día, progreso del plan, últimas 3 tareas pendientes
- [x] UI: card "Sesión de hoy" con referencia bíblica, card "Progreso" con barra, lista de tareas
- [x] Estado vacío cuando no hay plan activo
- [x] Skeleton de carga

### Fase 3 — Estudio del día (`/estudio`) ✅ COMPLETADA
- [x] `GET /api/estudio` → sesión activa + rango de versículos + análisis si existe
- [x] `POST /api/estudio/completar` → marca sesión como completada con timestamp
- [x] UI: versículos en Lora con número en superíndice, análisis en 5 secciones, botón completar

### Fase 4 — Lector Biblia (`/biblia`) ✅ COMPLETADA
- [x] `GET /api/biblia/libros` → 66 libros agrupados por testamento
- [x] `GET /api/biblia?libro_id=` → capítulos del libro
- [x] `GET /api/biblia?libro_id=&capitulo=` → versículos del capítulo
- [x] UI: selectores en cascada (libro → capítulo → versículos en Lora), optgroup AT/NT

### Fase 5 — Análisis (`/analisis`) ✅ COMPLETADA
- [x] `GET /api/analisis` → historial de análisis de todas las sesiones del usuario
- [x] UI: lista de cards con referencia bíblica + resumen truncado, expandibles inline con las 5 secciones
- Nota: generación por Llama es responsabilidad del agente Python externo — la web solo muestra resultados

### Fase 6 — Plan (`/plan`) ✅ COMPLETADA
- [x] `GET /api/plan` → todos los planes con progreso + sesiones del plan activo con refs bíblicas
- [x] `POST /api/plan` → crea plan y lo activa (desactiva los demás)
- [x] `PUT /api/plan/[id]` → activa/desactiva un plan
- [x] UI: plan activo con barra de progreso y lista de sesiones, otros planes con botón activar, formulario inline

### Fase 7 — Configuración (`/configuracion`) ✅ COMPLETADA
- [x] `GET /api/usuario` → perfil + stats (planes, sesiones completadas, análisis)
- [x] `PUT /api/usuario` → actualiza nombre
- [x] UI: stats en 3 cards, formulario con email (solo lectura) y nombre editable

---

## Proyectos relacionados

| Repo                 | Descripción                          | Visibilidad |
|----------------------|--------------------------------------|-------------|
| `bible-study-agents` | Agentes Python — análisis con Llama  | Privado     |
| `bible-study-web`    | Este repo — frontend + backend web   | Público     |
