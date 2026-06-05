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
Hover:             #F0EDE8  (crema oscuro)
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
- `max-w-3xl` como ancho de contenido estándar en todas las páginas

---

## Estructura de carpetas

```
bible-study-web/
├── app/
│   ├── layout.tsx                       # Layout raíz con fuentes y nav
│   ├── page.tsx                         # Dashboard (ruta /)
│   ├── login/
│   │   └── page.tsx                     # Login / registro
│   ├── estudio/
│   │   └── page.tsx                     # Estudio del día
│   ├── biblia/
│   │   └── page.tsx                     # Lector de Biblia
│   ├── analisis/
│   │   └── page.tsx                     # Historial de análisis
│   ├── plan/
│   │   └── page.tsx                     # Gestión del plan
│   ├── configuracion/
│   │   └── page.tsx                     # Perfil, contraseña, zona de peligro
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts           # POST — inicia sesión
│       │   ├── registro/route.ts        # POST — crea usuario (admin.createUser, sin email)
│       │   ├── logout/route.ts          # POST — cierra sesión
│       │   └── cambiar-password/route.ts# POST — verifica pass actual, actualiza con admin API
│       ├── dashboard/route.ts           # GET — sesión del día, progreso, tareas pendientes
│       ├── estudio/
│       │   ├── route.ts                 # GET — sesión activa + versículos (con capitulo_numero) + análisis
│       │   └── completar/route.ts       # POST — marca sesión completada con timestamp
│       ├── biblia/
│       │   ├── libros/route.ts          # GET — 66 libros ordenados por testamento
│       │   ├── route.ts                 # GET — capítulos (libro_id) o versículos (libro_id + capitulo)
│       │   └── buscar/route.ts          # GET — búsqueda full-text con ilike, limit 30
│       ├── analisis/route.ts            # GET — historial de análisis del usuario
│       ├── plan/
│       │   ├── route.ts                 # GET — planes + sesiones del activo; POST — crear plan
│       │   └── [id]/route.ts            # PUT — activar/desactivar plan
│       ├── sesion/
│       │   └── [id]/versiculos/route.ts # GET — versículos de sesión (con capitulo_numero)
│       └── usuario/route.ts             # GET — perfil + stats; PUT — nombre; DELETE — eliminar cuenta
├── components/
│   └── ui/
│       ├── Nav.tsx                      # Nav responsiva: hamburger móvil, horizontal desktop
│       └── NavWrapper.tsx               # Oculta Nav en /login
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

**Producción (Vercel):**
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

- **`auth.admin.createUser({ email_confirm: true })`** en registro — evita envío de email y rate limits
- **Middleware `PUBLIC_PATHS`** incluye `"/login"` y `"/api/auth"` — sin esto las rutas de auth quedan bloqueadas
- **Verso range en sesiones:** mismo capítulo → rango por `numero`; distinto capítulo → rango por `id`
- **`capitulo_numero` en versículos:** `/api/estudio` y `/api/sesion/[id]/versiculos` hacen join con `bible_capitulos` para devolver el número de capítulo en cada verso — necesario para mostrar encabezados de capítulo en el frontend sin queries extra
- **Stats en `/api/usuario`:** 3 queries secuenciales (plan IDs → sesion IDs → count analisis) porque Supabase JS no soporta subqueries en `.in()`
- **Versículos en `/analisis`** cargados lazy al expandir card, cacheados en `versiculosMap` por `sesion.id`
- **Nav** se oculta en `/login` vía `NavWrapper` con `usePathname`

---

## Patrones de UI compartidos

Estos patrones son consistentes en `/estudio`, `/analisis` y `/biblia`:

- **Encabezado de capítulo** — `— Capítulo N —` en Lora/acento con líneas flanqueantes antes del primer verso y en cada cambio de `id_capitulo`
- **A− / A+** — control de tamaño de texto en 3 niveles (`text-sm`, `text-base`, `text-lg`)
- **Clic para copiar** — cualquier verso se copia con su referencia completa al portapapeles; feedback visual azul + "copiado"
- **Hover en versos** — fondo `#F0EDE8` al pasar el ratón
- **Secciones de análisis colapsables** — accordion individual + "Colapsar todo / Expandir todo"
- **Divisor centrado** — `— Análisis —` separa texto bíblico de análisis en `/estudio` y `/analisis`

Específico de `/biblia`:
- **Barra de referencia inteligente** — parsea `Juan 3:16`, `Gén 1`, `Sal 23:1` etc. contra nombres y abreviaturas de libros
- **Highlight de versículo** — scroll automático + fondo azul suave 2.5s al navegar a versículo específico
- **Búsqueda full-text** — tab "Buscar texto" → `GET /api/biblia/buscar?q=` con `ilike`, resultados con término resaltado, clic navega al versículo
- **Explorar por libro** — dropdowns colapsados bajo toggle, disponibles como flujo alternativo
- **Prev/next capítulo** — flechas al pie con nombre del capítulo adyacente

---

## Estado del proyecto — COMPLETADO ✅

| Fase | Sección | Estado |
|------|---------|--------|
| 0 | Autenticación | ✅ |
| 1 | Layout y Nav responsiva | ✅ |
| 2 | Dashboard (`/`) | ✅ |
| 3 | Estudio (`/estudio`) | ✅ |
| 4 | Biblia (`/biblia`) | ✅ |
| 5 | Análisis (`/analisis`) | ✅ |
| 6 | Plan (`/plan`) | ✅ |
| 7 | Configuración (`/configuracion`) | ✅ |

Extras sobre el plan original:
- Cambio de contraseña con verificación de contraseña actual
- Zona de peligro (eliminar cuenta con confirmación por texto)
- Diseño completamente responsive (móvil + desktop)
- Texto bíblico inline en `/analisis` con carga lazy
- Mejoras de lector: A−/A+, copia de versículos, hover, encabezados de capítulo
- Búsqueda full-text en `/biblia` + barra de referencia inteligente con highlight
- Dashboard con saludo dinámico y stats de progreso mejoradas

---

## Proyectos relacionados

| Repo | Descripción | Visibilidad |
|------|-------------|-------------|
| `bible-study-agents` | Agentes Python — análisis con Llama | Privado |
| `bible-study-web` | Este repo — frontend + backend web | Público |
