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

> ⚠️ **El dataset incluido es SIMULADO.** Los partidos históricos se generan de
> forma **determinista** (seed fija) a partir del ranking FIFA de cada selección,
> así que son plausibles pero **no son resultados reales**. Los grupos, las
> selecciones, las confederaciones y la estructura del fixture sí son reales.

El script `scripts/build-dataset.ts` tiene dos modos (Opción A de la spec §4):

- **Sin API key** → genera el snapshot simulado (lo que está commiteado).
- **Con `API_FOOTBALL_KEY`** → camino para datos reales vía
  [API-Football](https://www.api-sports.io/). El punto de integración
  (`buildFromApiFootball`) está documentado en el script; falta completar el
  mapping `id FIFA → id de equipo de la API` según la cuenta antes de usarlo:

  ```bash
  API_FOOTBALL_KEY=xxxx npm run build:dataset
  ```

La simulación es **consciente de las confederaciones**: alterna ventanas de
eliminatorias/copas continentales (intra-confederación, rivalidades densas) con
amistosos inter-confederación. Por eso muchos cruces de grupos del Mundial
quedan inéditos (como en la realidad) mientras que los clásicos continentales
(ej. Argentina–Uruguay) tienen historial rico que dispara los insights de
dominancia y tendencia.

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
5. **Fuente de datos** → snapshot (simulado por defecto; build real con API key).
6. **"VS / en qué copa"** → se incluye competición, local/visitante y sede.

## Estructura

```
scripts/
  build-dataset.ts      # genera el snapshot (simulado o API-Football)
  validate-dataset.ts   # validación (48 equipos, 12 grupos x4, 72 fixtures)
src/
  data/teams.ts         # las 48 selecciones (datos reales)
  data/dataset.json     # snapshot generado
  lib/derive.ts         # forma / stats 4 años / H2H (puro, testeable)
  lib/insights.ts       # motor de insights determinista
  store.ts              # estado (Zustand) + selectores
  components/           # UI (tabs, ficha, fixture, modal H2H, semáforo, ...)
```
