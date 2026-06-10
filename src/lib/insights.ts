// Motor de insights deterministas (spec §8). Recibe un HeadToHead ya calculado
// + los nombres de las selecciones y devuelve UN insight por cruce, eligiendo
// la primera regla aplicable por prioridad. Puro y testeable.
import type { HeadToHead, Insight, MatchPerspectiva } from "../types";

interface Nombres {
  a: string;
  b: string;
}

function tendenciaReciente(cruces: MatchPerspectiva[], n = 3) {
  const recientes = cruces.slice(0, n);
  let g = 0, p = 0;
  for (const c of recientes) {
    if (c.resultado === "G") g++;
    else if (c.resultado === "P") p++;
  }
  return { g, p, n: recientes.length };
}

export function buildInsight(h2h: HeadToHead, nombres: Nombres): Insight {
  const { resumen, enfrentamientos } = h2h;
  const { a, b } = nombres;
  const { totalPJ, ganadosA, empates, ganadosB, golesA, golesB } = resumen;

  // 1) Sin historia.
  if (totalPJ === 0) {
    return {
      tono: "sin-historia",
      regla: "sin-historia",
      texto: `${a} y ${b} nunca se enfrentaron: es un cruce inédito, sin antecedentes que valgan.`,
    };
  }

  const golesProm = (golesA + golesB) / totalPJ;
  const tend = tendenciaReciente(enfrentamientos);

  // 2) Tendencia reciente que contradice el historial global.
  if (totalPJ >= 4 && ganadosA > ganadosB && tend.p >= 2 && tend.p > tend.g) {
    return {
      tono: "parejo",
      regla: "tendencia-contraria",
      texto: `Aunque ${a} domina el historial (${ganadosA}-${empates}-${ganadosB}), ${b} se quedó con ${tend.p} de los últimos ${tend.n} cruces.`,
    };
  }
  if (totalPJ >= 4 && ganadosB > ganadosA && tend.g >= 2 && tend.g > tend.p) {
    return {
      tono: "favorable",
      regla: "tendencia-contraria",
      texto: `Aunque ${b} domina el historial (${ganadosB}-${empates}-${ganadosA} a su favor), ${a} ganó ${tend.g} de los últimos ${tend.n} mano a mano.`,
    };
  }

  // 3) Dominancia clara (a favor de A o de B).
  const dom = Math.max(ganadosA, ganadosB);
  if (totalPJ >= 4 && dom / totalPJ >= 0.6 && Math.abs(ganadosA - ganadosB) >= 2) {
    const lider = ganadosA > ganadosB ? a : b;
    const ganados = Math.max(ganadosA, ganadosB);
    return {
      tono: ganadosA > ganadosB ? "favorable" : "parejo",
      regla: "dominancia",
      texto: `${lider} manda en el historial: ganó ${ganados} de los ${totalPJ} enfrentamientos (${ganadosA}-${empates}-${ganadosB}).`,
    };
  }

  // 4) Partidos de muchos goles.
  if (golesProm >= 3) {
    return {
      tono: "goleador",
      regla: "goles",
      texto: `Promedian ${golesProm.toFixed(1)} goles por cruce (${golesA}-${golesB} en ${totalPJ}): suelen ser partidos abiertos.`,
    };
  }

  // 5) Paridad / historial parejo (regla por defecto con historia).
  return {
    tono: "parejo",
    regla: "paridad",
    texto: `Historial parejo: ${ganadosA}-${empates}-${ganadosB} en ${totalPJ} partidos${
      resumen.ultimoCruce ? `, último en ${resumen.ultimoCruce.fecha}` : ""
    }.`,
  };
}
