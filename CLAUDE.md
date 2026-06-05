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
- Sin animaciones llamativas
- Priorizar el texto sobre los elementos decorativos
- `max-w-3xl` como ancho de contenido estándar en todas las páginas

---

## Estructura de carpetas

```
bible-study-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         # Dashboard (ruta /)
│   ├── login/page.tsx
│   ├── estudio/page.tsx
│   ├── biblia/page.tsx
│   ├── analisis/page.tsx
│   ├── plan/page.tsx
│   ├── configuracion/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── registro/route.ts        # admin.createUser — sin email, sin rate limit
│       │   ├── logout/route.ts
│       │   └── cambiar-password/route.ts
│       ├── dashboard/route.ts
│       ├── estudio/
│       │   ├── route.ts                 # GET — sesión + versiculos(capitulo_numero) + secciones + analisis
│       │   └── completar/route.ts
│       ├── biblia/
│       │   ├── libros/route.ts          # GET — filtra por version_biblica del usuario
│       │   ├── route.ts                 # GET — caps o versiculos + secciones, filtra por version
│       │   └── buscar/route.ts          # GET — full-text ilike, filtra por version, limit 30
│       ├── analisis/route.ts
│       ├── plan/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── sesion/
│       │   └── [id]/versiculos/route.ts # GET — versiculos(capitulo_numero) + secciones
│       └── usuario/route.ts             # GET/PUT(nombre,version_biblica)/DELETE
├── components/ui/
│   ├── Nav.tsx
│   └── NavWrapper.tsx
├── lib/
│   ├── supabase.ts                      # SERVER ONLY
│   ├── supabase-auth.ts                 # SERVER ONLY
│   ├── axios.ts
│   └── utils.ts
├── middleware.ts                        # PUBLIC_PATHS = ["/login", "/api/auth"]
├── types/index.ts
├── database/                            # Scripts SQL — fuente de verdad del esquema
└── .env.local
```

---

## Variables de entorno

**Desarrollo (`.env.local`):**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # NUNCA en NEXT_PUBLIC_
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

**Producción (Vercel):**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_API_BASE_URL=https://bible-study-web-mocha.vercel.app
```

---

## Base de datos — esquema completo

```sql
-- Contenido bíblico (inmutable)
bible_libros      → id, orden, nombre, abreviatura, testamento, version, created_at
                    UNIQUE(orden, version), UNIQUE(abreviatura, version)
bible_capitulos   → id, id_libro, numero, created_at
bible_versiculos  → id, id_capitulo, numero, texto, created_at
bible_secciones   → id, id_libro, capitulo, versiculo_inicio, titulo, created_at
                    UNIQUE(id_libro, capitulo, versiculo_inicio)

-- Usuarios y planes
bible_usuarios    → id (UUID), email, nombre, version_biblica, created_at
bible_planes      → id, id_usuario, nombre, descripcion, activo, created_at
bible_sesiones    → id, id_plan, orden, versiculo_inicio_id, versiculo_fin_id,
                    fecha_programada, fecha_completada, completada, created_at

-- Análisis y tareas
bible_analisis    → id, id_sesion, contexto_historico, resumen, temas_principales (TEXT),
                    conexiones, preguntas_reflexion (TEXT), modelo_usado,
                    tokens_usados, duracion_segundos, created_at
bible_tareas      → id, id_sesion, id_analisis, id_usuario,
                    descripcion, origen ('llama'|'usuario'), completada, notas, created_at

-- Configuración global
bible_configuracion → clave (PK), valor, descripcion, updated_at
  -- Registros: version_disponible_1..4 (RV1909/RVR1960/NVI/TLA), idioma, modelo_llama
```

**Versiones bíblicas disponibles:**

| Versión  | Versículos | Secciones |
|----------|------------|-----------|
| RV1909   | ~31 000    | No        |
| RVR1960  | ~31 000    | Sí        |
| NVI      | ~31 000    | Sí        |
| TLA      | ~26 000    | Sí        |

**Notas importantes:**
- `bible_usuarios.version_biblica` controla qué versión ve el usuario en el lector — default `'RVR1960'`
- `bible_libros.version` filtra todo el contenido bíblico — los constraints UNIQUE incluyen `version`
- `bible_secciones` se obtiene via JOIN con `bible_libros.version` — no hay columna `version` directa en la tabla
- Las sesiones (planes de estudio) están pinadas a IDs de versículos de cuando se creó el plan — cambiar `version_biblica` no afecta `/estudio` ni `/analisis`, solo al lector libre `/biblia`
- `bible_tareas.origen` tiene CHECK constraint: solo `'llama'` o `'usuario'`
- CASCADE DELETE en `bible_usuarios` elimina planes, sesiones, análisis y tareas

---

## Decisiones técnicas relevantes

- **`auth.admin.createUser({ email_confirm: true })`** — evita envío de email y rate limits
- **Middleware `PUBLIC_PATHS`** incluye `"/login"` y `"/api/auth"` — sin esto las rutas de auth quedan bloqueadas
- **Verso range en sesiones:** mismo capítulo → rango por `numero`; distinto capítulo → rango por `id`
- **`capitulo_numero` en versículos:** `/api/estudio` y `/api/sesion/[id]/versiculos` hacen join con `bible_capitulos` para devolver el número de capítulo en cada verso — necesario para encabezados de capítulo sin queries extra
- **`secciones` en los endpoints de versículos:** se consulta `bible_secciones` filtrando por `id_libro` + rango de capítulos (`gte`/`lte`) en paralelo con la query de versículos. El frontend hace `find()` por `capitulo + versiculo_inicio` para insertar el título antes del verso correcto
- **Filtrado por versión en `/api/biblia`:** todos los endpoints verifican `bible_usuarios.version_biblica` del usuario autenticado antes de servir libros, capítulos, versículos o resultados de búsqueda
- **Búsqueda full-text `/api/biblia/buscar`:** Supabase no permite `.eq()` sobre relaciones anidadas, por eso busca con `limit 60` y filtra en memoria por `libro.version` para devolver 30 resultados de la versión correcta
- **Stats en `/api/usuario`:** 3 queries secuenciales (plan IDs → sesion IDs → count analisis) — Supabase JS no soporta subqueries en `.in()`
- **Versículos en `/analisis`** lazy al expandir card, cacheados en `versiculosMap` y `seccionesMap` por `sesion.id`
- **Nav** oculta en `/login` vía `NavWrapper` con `usePathname`

---

## Patrones de UI compartidos

Consistentes en `/estudio`, `/analisis` y `/biblia`:

- **Encabezado de capítulo** — `— Capítulo N —` en Lora/acento con líneas flanqueantes; aparece en el primer verso y en cada cambio de `id_capitulo`
- **Título de sección** — Inter, uppercase, tracking-widest, acento; aparece antes del primer verso de cada sección según `bible_secciones`; solo visible en versiones con datos (RVR1960, NVI, TLA)
- **A− / A+** — control de tamaño de texto en 3 niveles (`text-sm`, `text-base`, `text-lg`)
- **Clic para copiar** — cualquier verso se copia con su referencia completa; feedback visual azul + "copiado"
- **Hover en versos** — fondo `#F0EDE8`
- **Secciones de análisis colapsables** — accordion individual + "Colapsar todo / Expandir todo"
- **Divisor centrado** — `— Análisis —` separa texto bíblico de análisis en `/estudio` y `/analisis`

Específico de `/biblia`:
- **Barra de referencia inteligente** — parsea `Juan 3:16`, `Gén 1`, `Sal 23:1` etc. contra nombres y abreviaturas
- **Highlight de versículo** — scroll automático + fondo azul 2.5s al navegar a versículo específico
- **Búsqueda full-text** — tab "Buscar texto", resultados con término resaltado, clic navega al versículo
- **Explorar por libro** — dropdowns colapsados como flujo alternativo
- **Prev/next capítulo** — flechas al pie con nombre del capítulo adyacente
- **Badge de versión** — muestra la versión activa (RVR1960, NVI…) junto al título

Específico de `/configuracion`:
- **Selector de versión bíblica** — 4 botones tipo radio (RV1909, RVR1960, NVI, TLA) con label + descripción; guarda inmediatamente via `PUT /api/usuario`

---

## Estado del proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Autenticación | ✅ |
| 1 | Layout y Nav responsiva | ✅ |
| 2 | Dashboard | ✅ |
| 3 | Estudio (`/estudio`) | ✅ |
| 4 | Lector (`/biblia`) | ✅ |
| 5 | Análisis (`/analisis`) | ✅ |
| 6 | Plan (`/plan`) | ✅ |
| 7 | Configuración (`/configuracion`) | ✅ |
| A | Selector de versión bíblica | ✅ |
| B | Filtrado por versión en `/biblia` | ✅ |
| C | Títulos de sección (`bible_secciones`) | ✅ |

---

## Proyectos relacionados

| Repo | Descripción | Visibilidad |
|------|-------------|-------------|
| `bible-study-agents` | Agentes Python — análisis con Llama | Privado |
| `bible-study-web` | Este repo — frontend + backend web | Público |
