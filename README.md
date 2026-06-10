# Prode Stats · Mundial 2026

App web mobile-first para explorar estadísticas de las **48 selecciones** del
Mundial FIFA 2026 y tomar mejores decisiones al armar el prode. Implementa la
spec `0.1` que está en el historial del repo.

No es una app de apuestas ni carga tu prode: es una herramienta de **consulta y
análisis** previa a completarlo en la plataforma que uses.

## Qué hace

- **Tab Selecciones**: grilla de las 48 con buscador y agrupadas por grupo. Al
  elegir una, su ficha muestra:
  - **Forma**: últimos 10 partidos con semáforo 🟢 ganó / 🟡 empató / 🔴 perdió
    (color **+ ícono + texto**, accesible), con resultado, rival, competición y
    fecha, más la tira compacta de la racha.
  - **Últimos 4 años** (ventana móvil de 48 meses): % de victorias y récord
    G-E-P, goles a favor/en contra por partido, racha actual y un sparkline de
    tendencia.
- **Tab Mundial 2026**: fixture de los **72 partidos** de fase de grupos. Cada
  cruce abre el cara a cara histórico (resumen G-E-G, goles, lista de
  enfrentamientos) y **1 insight** automático. Maneja los cruces **inéditos**
  (sin historia) con un estado dedicado. Incluye un **selector libre A vs B**
  para anticipar posibles cruces de eliminatorias.

## Stack

React + Vite + TypeScript, Tailwind, Zustand. Sin backend: la app lee un
**snapshot estático** (`src/data/dataset.json`) que se incrusta en el bundle
(Opción A de la spec). El motor de insights es 100% determinista y testeable.

## Cómo correrlo

```bash
npm install
npm run dev         # desarrollo
npm run build       # typecheck + build de producción a dist/
npm run preview     # sirve el build

npm test            # tests (motor de insights, derivaciones, validación dataset)
npm run build:dataset      # regenera src/data/dataset.json
npm run validate:dataset   # valida el dataset (48 equipos, 12 grupos x4, 72 fixtures)
```

## Datos

El dataset commiteado son **datos reales** (Opción A de la spec §4). El script
`scripts/build-dataset.ts` soporta tres fuentes, elegibles con `DATA_SOURCE`:

### 1. Open data (por defecto, real, sin API key) ✅

Usa el proyecto abierto
[**martj42/international_results**](https://github.com/martj42/international_results):
un CSV con **todos** los partidos de selecciones desde 1872 (amistosos,
eliminatorias, copas, mundiales), gratis, sin key ni rate limit, y que además
**incluye el fixture real del Mundial 2026** (fechas y sedes reales). Se clona
por `git` y se cachea en `scripts/.cache/`.

```bash
npm run build:dataset                 # datos reales, sin configurar nada
OPEN_DATA_SINCE=1990-01-01 npm run build:dataset   # más historia (H2H más profundo)
```

- `OPEN_DATA_SINCE` (default `2002-01-01`) controla cuánta historia se incluye.
  Más atrás = H2H más completo pero snapshot más grande (1990 ≈ 2.3MB,
  2002 ≈ 1.6MB, 2010 ≈ 1.1MB).
- Las selecciones rivales que no están entre las 48 se agregan como no
  clasificadas (`qualified:false`) para que la forma y el H2H sean fieles.
- El ranking FIFA mostrado es aproximado (no viene en esta fuente).

### 2. API-Football (real, requiere key)

```bash
API_FOOTBALL_KEY=xxxx npm run build:dataset   # DATA_SOURCE pasa a "api-football"
```

  El camino real (`buildFromApiFootball`) está **implementado de punta a punta**:

  1. Resuelve el id de equipo de cada selección por nombre
     (`GET /teams?search=`, filtrando `national:true`) — no hay que hardcodear
     ids. Hay un override opcional `API_TEAM_ID_OVERRIDE` por si alguna búsqueda
     es ambigua.
  2. Trae los partidos de cada una **por temporada**
     (`GET /fixtures?team=&season=`), queda sólo con los terminados
     (FT/AET/PEN) y deduplica los compartidos.
  3. Suma como rivales históricos (no clasificados) a cualquier selección que
     aparezca y no esté entre las 48 (con su escudo de la API como bandera).
  4. **Cachea cada respuesta en disco** (`scripts/.cache/`) y **throttlea**
     (`API_FOOTBALL_DELAY_MS`, 1600 ms por defecto) para sobrevivir al rate
     limit del free tier (~100 req/día) y poder reanudar entre corridas.
     Variables: `API_FOOTBALL_SEASONS` (temporadas, ej. `2023,2022,2021`),
     `API_FOOTBALL_CACHE_DIR`, `API_FOOTBALL_RETRIES`.

  **⚠️ Límites del plan Free de api-sports.io** (importante):
  - No admite el parámetro `last` → por eso pedimos por temporada.
  - Sólo cubre algunas temporadas (históricamente **2021–2023**); las no
    disponibles se saltan con un warning, no abortan el build.
  - **~100 requests/día** y **~10/min**. El build gasta 48 (búsqueda de ids,
    una sola vez gracias al caché) + 48 × Nº de temporadas. Con **1 temporada**
    entra en una corrida (~96 req); con más, se completa en días sucesivos
    (el caché reanuda) o con un plan pago. Para limitar a una temporada:
    ```bash
    API_FOOTBALL_SEASONS=2023 API_FOOTBALL_KEY=xxxx npm run build:dataset
    ```
  - Si se agota la cuota diaria, el script corta con un mensaje claro y lo ya
    bajado queda en `scripts/.cache/` para reanudar después sin repetir.

  > Para tener historial reciente completo (2024-2026) hace falta un plan pago;
  > el Free queda topado en 2023.

  El flujo está testeado contra respuestas mockeadas en
  `scripts/api-football.test.ts` (sin red).

### 3. Simulado (sin red, para demo/desarrollo)

```bash
DATA_SOURCE=simulated npm run build:dataset
```

Genera partidos **deterministas** (seed fija) a partir del ranking FIFA, sin red
ni API key. Es **consciente de las confederaciones**: alterna ventanas de
eliminatorias/copas continentales (intra-confederación) con amistosos
inter-confederación, así que los clásicos continentales tienen historial rico y
muchos cruces inter-confederación quedan inéditos. No son resultados reales.

### Modelo de datos

`Dataset = { meta, teams, matches, fixtures }`. La forma reciente, las stats de
4 años y el H2H se calculan en runtime a partir del log de `matches`
(`src/lib/derive.ts`), lo que permite el selector libre A-vs-B sobre cualquier
par. Ver tipos en `src/types.ts`.

## Motor de insights

Reglas deterministas por prioridad (`src/lib/insights.ts`): sin historia →
tendencia reciente que contradice el global → dominancia clara → muchos goles →
paridad. Cada regla produce un texto en español rioplatense y un tono. La capa
opcional de redacción con IA queda como mejora futura (spec §8).

## Decisiones tomadas (spec §11)

Como la spec dejaba decisiones abiertas, se resolvieron con defaults razonables:

1. **Punto 2 de la ficha** → sparkline de forma + card de ranking FIFA.
2. **Stats de 4 años** → las 4 propuestas (% victorias, goles prom., racha,
   tendencia).
3. **Arquitectura** → **Opción A** (snapshot estático, sin backend, apto artifact).
4. **Insights** → solo reglas deterministas (capa LLM como backlog).
5. **Fuente de datos** → snapshot real por defecto desde open data
   (martj42/international_results); API-Football y simulado como alternativas.
6. **"VS / en qué copa"** → se incluye competición, local/visitante y sede.

## Estructura

```
scripts/
  build-dataset.ts      # genera el snapshot (open data / API-Football / simulado)
  validate-dataset.ts   # validación (48 equipos, 12 grupos x4, 72 fixtures)
src/
  data/teams.ts         # las 48 selecciones (datos reales)
  data/dataset.json     # snapshot generado
  lib/derive.ts         # forma / stats 4 años / H2H (puro, testeable)
  lib/insights.ts       # motor de insights determinista
  store.ts              # estado (Zustand) + selectores
  components/           # UI (tabs, ficha, fixture, modal H2H, semáforo, ...)
```
