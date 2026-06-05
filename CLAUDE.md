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
│   ├── resaltados/page.tsx              # Versículos resaltados agrupados por testamento/libro
│   ├── comparar/page.tsx                # Versículo exacto en las 4 versiones disponibles
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
│       │   ├── libros/route.ts          # GET — acepta ?version= override; fallback a version_biblica del usuario
│       │   ├── route.ts                 # GET — caps o versiculos + secciones; acepta ?version= override
│       │   ├── buscar/route.ts          # GET — RPC accent-insensitive con fallback a ilike; acepta ?version=
│       │   └── comparar/route.ts        # GET — mismo pasaje en múltiples versiones en paralelo
│       ├── analisis/route.ts
│       ├── resaltados/
│       │   ├── route.ts                 # GET ?versiculos=1,2,3 · POST { id_versiculo, color }
│       │   ├── [versiculoId]/route.ts   # DELETE — elimina resaltado del usuario autenticado
│       │   └── todos/route.ts           # GET — todos los resaltados con join verso→cap→libro
│       ├── plan/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   ├── templates/route.ts       # GET — lista templates activos con fases
│       │   ├── templates/[id]/route.ts  # GET — detalle template con fases + librosMap
│       │   └── adoptar/route.ts         # POST — crea plan personal desde template
│       ├── sesion/
│       │   └── [id]/versiculos/route.ts # GET — versiculos(capitulo_numero) + secciones
│       └── usuario/route.ts             # GET/PUT(nombre,version_biblica)/DELETE
├── components/ui/
│   ├── Nav.tsx
│   ├── NavWrapper.tsx
│   └── FloatingVerseMenu.tsx            # Menú flotante de acciones por versículo
├── hooks/
│   └── useResaltados.ts                 # Estado de resaltados con optimistic update
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

-- Resaltados de versículos por usuario
bible_resaltados  → id SERIAL, id_usuario UUID (FK bible_usuarios), id_versiculo INT (FK bible_versiculos),
                    color TEXT CHECK (color IN ('amarillo','verde','azul','rosa','naranja')),
                    created_at TIMESTAMPTZ DEFAULT now()
                    UNIQUE (id_usuario, id_versiculo)
                    -- Script: database/009_resaltados.sql
```

**Tablas de templates de planes (inmutables del sistema + creables por usuario):**
```sql
bible_planes_templates          → id, titulo, descripcion, para_quien,
                                  nivel ('principiante'|'intermedio'|'avanzado'|'completo'),
                                  es_completo BOOLEAN,
                                  duracion_estimada_dias INTEGER,
                                  icono TEXT,        -- nombre Tabler: 'ti-map-2', 'ti-seedling', etc.
                                  color_acento TEXT, -- 'info'|'warning'|'success'|'danger'
                                  recomendado BOOLEAN,
                                  creado_por ('sistema'|'usuario'),
                                  id_usuario UUID,
                                  activo BOOLEAN,
                                  orden INTEGER

bible_planes_templates_fases    → id, id_template, numero, titulo, descripcion, color_acento
                                  -- color_acento: 'info'|'warning'|'success'|'danger'|'secondary'

bible_planes_templates_sesiones → id, id_fase, orden,
                                  abreviatura_libro TEXT,
                                  capitulo_inicio INTEGER,
                                  capitulo_fin INTEGER
                                  -- Abstractas — sin IDs de versículos (se resuelven al adoptar)
```

**7 templates disponibles en Supabase:**

| Orden | Título | Nivel | Días | Fases |
|-------|--------|-------|------|-------|
| 1 | Primera vez | principiante | ~90 | 3 |
| 2 | Devocional diario | principiante | ~60 | 2 |
| 3 | La vida de Jesús | principiante | ~89 | 4 |
| 4 | Las enseñanzas de Jesús | principiante | ~73 | 3 |
| 5 | Jesús y la iglesia | intermedio | ~138 | 5 |
| 6 | La gran historia | completo | ~338 | 7 |
| 7 | Cronológico | intermedio | ~338 | 9 |

**RPC (Supabase SQL — ver `database/008_busqueda_sin_tildes.sql`):**
```sql
buscar_versiculos_v2(termino TEXT, p_version TEXT)
  → busca versículos con unaccent(lower(...)) LIKE — requiere extensión unaccent
  → fallback automático a ilike en el route handler si el RPC no existe
```

**Versiones bíblicas disponibles:**

| Versión  | Versículos | Secciones |
|----------|------------|-----------|
| RV1909   | ~31 000    | No        |
| RVR1960  | ~31 000    | Sí        |
| NVI      | ~31 000    | Sí        |
| TLA      | ~26 000    | Sí        |

**Notas importantes:**
- `bible_usuarios.version_biblica` controla la versión permanente del usuario (usada en `/estudio`, `/analisis`, `/configuracion`)
- Las pills de versión en `/biblia` son **estado local** — no modifican `version_biblica` del perfil, solo cambian la versión del lector en esa sesión
- `/api/biblia/libros`, `/api/biblia` y `/api/biblia/buscar` aceptan `?version=` override: si se pasa y es válido, lo usan en lugar de la versión guardada del usuario
- `bible_libros.version` filtra todo el contenido bíblico — los constraints UNIQUE incluyen `version`
- `bible_secciones` se obtiene via JOIN con `bible_libros.version` — no hay columna `version` directa en la tabla
- Las sesiones están pinadas a IDs de versículos de cuando se creó el plan — cambiar `version_biblica` no afecta `/estudio` ni `/analisis`
- `bible_tareas.origen` tiene CHECK constraint: solo `'llama'` o `'usuario'`
- CASCADE DELETE en `bible_usuarios` elimina planes, sesiones, análisis y tareas

---

## Decisiones técnicas relevantes

- **`auth.admin.createUser({ email_confirm: true })`** — evita envío de email y rate limits
- **Middleware `PUBLIC_PATHS`** incluye `"/login"` y `"/api/auth"` — sin esto las rutas de auth quedan bloqueadas
- **Verso range en sesiones:** mismo capítulo → rango por `numero`; distinto capítulo → rango por `id`
- **`capitulo_numero` en versículos:** `/api/estudio` y `/api/sesion/[id]/versiculos` hacen join con `bible_capitulos` para devolver el número de capítulo en cada verso — necesario para encabezados de capítulo sin queries extra
- **`secciones` en los endpoints de versículos:** se consulta `bible_secciones` filtrando por `id_libro` + rango de capítulos (`gte`/`lte`) en paralelo con la query de versículos. El frontend hace `find()` por `capitulo + versiculo_inicio` para insertar el título antes del verso correcto
- **`?version=` override en `/api/biblia/*`:** si el param está presente y es válido (`RV1909|RVR1960|NVI|TLA`), se usa directamente sin leer `bible_usuarios`; si no, cae al perfil del usuario. Permite cambio local de versión sin afectar configuración
- **Versiones disponibles para selects UI:** obtener de `bible_configuracion` con `.like('clave', 'version_disponible_%')` — retorna RV1909, RVR1960, NVI, TLA
- **`POST /api/plan/adoptar` — resolución de versículos:** las sesiones de un template son abstractas (abreviatura + capítulo). Al adoptar se resuelven a IDs reales: `versiculo_inicio_id` = primer versículo del `capitulo_inicio` (`v.numero = 1`); `versiculo_fin_id` = último versículo del `capitulo_fin` (`ORDER BY v.numero DESC LIMIT 1`). Se usa `Promise.all` en lotes para no serializar las ~338 sesiones de los templates más largos
- **`/api/biblia/buscar`:** intenta RPC `buscar_versiculos_v2` (accent-insensitive via `unaccent`); si falla, cae a `ilike` básico con filtro en memoria por versión
- **`/api/biblia/comparar`:** recibe `libro` (nombre), `capitulo` y `versiones` (CSV); busca el libro por `ilike` en cada versión, luego trae versículos y secciones en paralelo con `Promise.all`
- **`parsearReferencia` en `/biblia`:** normaliza acentos con NFD+strip en ambos lados (input y nombres de libro) — `genesis`, `génesis` y `Génesis` resuelven al mismo libro; la longitud se preserva para slicear correctamente el texto original
- **Lector compartido en `/biblia`:** el estado del lector (`libroId`, `capituloNum`, `versiculos`, etc.) es compartido entre los tabs "Ir a referencia" y "Buscar libro" — cambiar de tab no limpia el contenido cargado
- **Autocompletado de libros en `/biblia`:** filtrado 100% local (`useMemo` sobre `libros` ya cargados), accent-insensitive, sin llamadas a la API. Se muestra cuando el input no contiene aún un número de capítulo (`/\s+\d/` → ocultar)
- **Stats en `/api/usuario`:** 3 queries secuenciales (plan IDs → sesion IDs → count analisis) — Supabase JS no soporta subqueries en `.in()`
- **Versículos en `/analisis`** lazy al expandir card, cacheados en `versiculosMap` y `seccionesMap` por `sesion.id`
- **Nav** oculta en `/login` vía `NavWrapper` con `usePathname`
- **`bible_resaltados` upsert:** usa `.upsert({ ... }, { onConflict: "id_usuario,id_versiculo" })` — permite cambiar el color de un resaltado existente sin error
- **`useResaltados` hook:** estado compartido en `/estudio`, `/biblia`, `/analisis`. Optimistic update en `guardar` y `quitar`; rollback si la llamada a la API falla
- **`/api/resaltados/todos`:** join en cadena `bible_resaltados → bible_versiculos → bible_capitulos → bible_libros` via nested select de Supabase JS; devuelve shape plano para el frontend
- **`FloatingVerseMenu`:** menú flotante con dos vistas — acciones (Resaltar / Copiar / Compartir / Comparar) y selector de color. Se activa con clic en versículo (sin selección) o `mouseup` cuando hay texto seleccionado. `onMouseDown={(e) => e.preventDefault()}` preserva la selección activa mientras el menú está visible
- **`/comparar`:** recibe `?libro=&capitulo=&versiculo=` — llama a `/api/biblia/comparar` para el capítulo completo y filtra al versículo exacto en cada versión. Muestra grid 2 columnas con tarjeta por versión

---

## Patrones de UI compartidos

Consistentes en `/estudio`, `/analisis` y `/biblia`:

- **Encabezado de capítulo** — `— Capítulo N —` en Lora/acento con líneas flanqueantes; aparece en el primer verso y en cada cambio de `id_capitulo`
- **Título de sección** — Inter, uppercase, tracking-widest, acento; aparece antes del primer verso de cada sección según `bible_secciones`; solo visible en versiones con datos (RVR1960, NVI, TLA)
- **A− / A+** — control de tamaño de texto en 3 niveles (`text-sm`, `text-base`, `text-lg`)
- **Menú flotante de versículo** (`FloatingVerseMenu`) — toque o selección de texto abre menú con: Resaltar (sub-panel de 5 colores), Copiar, Compartir, Comparar. Reemplaza el antiguo "clic para copiar"
- **Resaltado de versículos** — fondo coloreado según `bible_resaltados`; 5 colores: amarillo, verde, azul, rosa, naranja. `COLORES_RESALTADO` exportado desde `FloatingVerseMenu.tsx` contiene `{ bg, fg, swatch }` por token
- **Hover en versos** — fondo `#F0EDE8`
- **Secciones de análisis colapsables** — accordion individual + "Colapsar todo / Expandir todo"
- **Divisor centrado** — `— Análisis —` separa texto bíblico de análisis en `/estudio` y `/analisis`

Específico de `/biblia`:
- **Tres tabs:** "Ir a referencia" · "Buscar libro" · "Comparar"
- **"Ir a referencia"** — input con autocomplete de libro (dropdown local mientras escribes el nombre); soporta `Juan 3:16`, `Gén 1`, `genesis 1:10` (accent-insensitive); explorar por libro colapsable
- **"Buscar libro"** — autocomplete de nombres de libro (accent-insensitive, highlight); al seleccionar carga capítulo 1 y muestra el lector en el mismo tab sin cambiar de modo
- **"Comparar"** — mismo input con autocomplete de libro; selección de versiones (pills toggle, mín. 2); resultados en grid 2 columnas (desktop) / 1 columna (móvil)
- **Lector compartido** entre "Ir a referencia" y "Buscar libro" — versículos, A−/A+, prev/next capítulo, clic para copiar, highlight de versículo con scroll
- **Pills de versión** — estado local, sin afectar perfil; al cambiar recarga libros y si había un pasaje activo lo recarga en la nueva versión
- **Highlight de versículo** — scroll automático + fondo azul 2.5s al navegar a versículo específico
- **Prev/next capítulo** — flechas al pie con nombre del capítulo adyacente

Específico de `/plan/templates` (⏳ pendiente):
- **Cards agrupadas en 3 secciones:** "Para comenzar" (Primera vez, Devocional diario) · "La vida y enseñanzas de Jesús" (3 templates) · "Recorrido completo" (La gran historia —recomendado—, Cronológico)
- **Cada card:** ícono Tabler, título, descripción, badges (nivel, días), botón "Comenzar este camino"
- **Vista de detalle:** métricas (nivel, libros, sesiones, capítulos/día), descripción "para quién", lista de fases con libros y días estimados
- **Modal de adopción:** selector de versión bíblica (default RVR1960), nombre del plan (pre-llenado, editable), botón "Crear mi plan" → `POST /api/plan/adoptar` → redirige a `/plan`

Específico de `/configuracion`:
- **Selector de versión bíblica** — 4 botones tipo radio (RV1909, RVR1960, NVI, TLA) con label + descripción; guarda inmediatamente via `PUT /api/usuario`; esta es la versión permanente del perfil

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
| D | Pills de versión local + lector compartido en `/biblia` | ✅ |
| E | Autocomplete de libros + parser accent-insensitive | ✅ |
| F | Panel comparativo multi-versión | ✅ |
| G | Templates de planes (`/plan/templates`) | ✅ |
| H | Resaltado de versículos + menú flotante | ✅ |
| I | Página `/resaltados` (versículos marcados) | ✅ |
| J | Página `/comparar` (versículo en todas las versiones) | ✅ |

---

## Proyectos relacionados

| Repo | Descripción | Visibilidad |
|------|-------------|-------------|
| `bible-study-agents` | Agentes Python — análisis con Llama | Privado |
| `bible-study-web` | Este repo — frontend + backend web | Público |
