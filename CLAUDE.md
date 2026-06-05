# bible-study-web

## Contexto del proyecto

Frontend y backend web del sistema de estudio bíblico. Consume la misma base de datos Supabase que `bible-study-agents`. Construido con Next.js 14 usando App Router.

Los scripts SQL en `/database` son la fuente de verdad del esquema real de la BD.

La plataforma es multiusuario: cada usuario tiene sus propios planes, sesiones y tareas. La autenticación es prerequisito de todo lo demás.

La lógica de negocio vive en Route Handlers (`app/api/`). El frontend son Client Components que consumen esos endpoints via Axios. Supabase nunca se toca desde el cliente.

Proyecto hermano: `bible-study-agents` (agentes Python que analizan con Llama 3.1 y notifican por Slack).

---

## Deploy

- **Producción:** https://bible-study-web-mocha.vercel.app
- **Repo:** https://github.com/dajomar/bible-study-web
- **CI/CD:** cada `git push origin main` despliega automáticamente en Vercel
- **Variables de entorno en Vercel:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`

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
│   ├── layout.tsx                       # Layout raíz con fuentes y nav
│   ├── page.tsx                         # Dashboard / overview (ruta /)
│   ├── login/
│   │   └── page.tsx                     # Login / registro
│   ├── estudio/
│   │   └── page.tsx                     # Estudio del día (texto + análisis)
│   ├── biblia/
│   │   └── page.tsx                     # Lector de Biblia (buscar por libro)
│   ├── analisis/
│   │   └── page.tsx                     # Historial de análisis con texto bíblico inline
│   ├── plan/
│   │   └── page.tsx                     # Gestión del plan de estudios
│   ├── configuracion/
│   │   └── page.tsx                     # Perfil, cambio de contraseña, zona de peligro
│   └── api/                             # Route Handlers — backend interno
│       ├── auth/
│       │   ├── login/route.ts           # POST — inicia sesión
│       │   ├── registro/route.ts        # POST — crea usuario (admin.createUser, sin email)
│       │   ├── logout/route.ts          # POST — cierra sesión
│       │   └── cambiar-password/route.ts# POST — verifica pass actual, actualiza con admin API
│       ├── dashboard/route.ts           # GET — sesión del día, progreso, tareas pendientes
│       ├── estudio/
│       │   ├── route.ts                 # GET — sesión activa + versículos + análisis
│       │   └── completar/route.ts       # POST — marca sesión completada con timestamp
│       ├── biblia/
│       │   ├── libros/route.ts          # GET — 66 libros ordenados por testamento
│       │   └── route.ts                 # GET — capítulos (libro_id) o versículos (libro_id + capitulo)
│       ├── analisis/route.ts            # GET — historial de análisis del usuario
│       ├── plan/
│       │   ├── route.ts                 # GET — todos los planes + sesiones del activo; POST — crear plan
│       │   └── [id]/route.ts            # PUT — activar/desactivar plan
│       ├── sesion/
│       │   └── [id]/versiculos/route.ts # GET — versículos de una sesión (mismo/distinto capítulo)
│       └── usuario/route.ts             # GET — perfil + stats; PUT — nombre; DELETE — eliminar cuenta
├── components/
│   └── ui/
│       ├── Nav.tsx                      # Nav responsiva: hamburger móvil, horizontal desktop
│       └── NavWrapper.tsx              # Oculta Nav en /login
├── lib/
│   ├── supabase.ts                      # Cliente admin con service role — SERVER ONLY
│   ├── supabase-auth.ts                 # Cliente SSR con cookies — SERVER ONLY
│   ├── axios.ts                         # Instancia Axios con NEXT_PUBLIC_API_BASE_URL
│   └── utils.ts                         # Helpers generales
├── middleware.ts                        # Protege rutas; PUBLIC_PATHS = ["/login", "/api/auth"]
├── types/
│   └── index.ts                         # Tipos TypeScript de todas las entidades
├── database/                            # Scripts SQL — fuente de verdad del esquema
├── CLAUDE.md
└── .env.local
```

---

## Variables de entorno

**Desarrollo (`.env.local`):**
```
SUPABASE_URL=                       # URL del proyecto Supabase
SUPABASE_SERVICE_ROLE_KEY=          # NUNCA en NEXT_PUBLIC_
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

**Producción (Vercel dashboard / CLI):**
```
SUPABASE_URL=                       # igual que local
SUPABASE_SERVICE_ROLE_KEY=          # igual que local
NEXT_PUBLIC_API_BASE_URL=https://bible-study-web-mocha.vercel.app
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
- CASCADE DELETE en `bible_usuarios` elimina planes, sesiones, análisis y tareas en cadena

---

## Decisiones técnicas relevantes

- **`auth.admin.createUser({ email_confirm: true })`** en registro — evita envío de email y rate limits de Supabase
- **Middleware `PUBLIC_PATHS`** incluye tanto `"/login"` como `"/api/auth"` — sin esto las rutas de auth quedan bloqueadas
- **Verso range en sesiones:** mismo capítulo → rango por `numero` (gte/lte); distinto capítulo → rango por `id` (gte/lte)
- **Stats en `/api/usuario`:** Supabase JS no soporta subqueries en `.in()` — se hace en 3 queries secuenciales (plan IDs → sesion IDs → count analisis)
- **Versículos en `/analisis`** se cargan de forma lazy al expandir cada card, cacheados en `versiculosMap` por `sesion.id`
- **Nav responsiva:** hamburger animado en móvil, links horizontales en desktop; se oculta completamente en `/login` vía `NavWrapper`

---

## Estado del proyecto — COMPLETADO ✅

Todas las fases implementadas y desplegadas en producción:

| Fase | Sección            | Estado |
|------|--------------------|--------|
| 0    | Autenticación      | ✅     |
| 1    | Layout y Nav       | ✅     |
| 2    | Dashboard (`/`)    | ✅     |
| 3    | Estudio (`/estudio`)| ✅    |
| 4    | Biblia (`/biblia`) | ✅     |
| 5    | Análisis (`/analisis`) | ✅ |
| 6    | Plan (`/plan`)     | ✅     |
| 7    | Configuración (`/configuracion`) | ✅ |

Extras implementados sobre el plan original:
- Cambio de contraseña con verificación de contraseña actual
- Zona de peligro (eliminar cuenta con confirmación por texto)
- Diseño completamente responsive (móvil + desktop)
- Texto bíblico inline en `/analisis` con carga lazy por sesión

---

## Proyectos relacionados

| Repo                 | Descripción                          | Visibilidad |
|----------------------|--------------------------------------|-------------|
| `bible-study-agents` | Agentes Python — análisis con Llama  | Privado     |
| `bible-study-web`    | Este repo — frontend + backend web   | Público     |
