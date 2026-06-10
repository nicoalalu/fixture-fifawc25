import datasetJson from "../data/dataset.json";
import type { Dataset } from "../types";

// El snapshot estático se incrusta en el bundle (Opción A de la spec).
export const dataset = datasetJson as Dataset;

/** Fecha de referencia para la ventana de "últimos 4 años". En la app usamos
 *  la fecha de generación del snapshot para que las stats sean estables y
 *  coherentes con los datos (los partidos no van más allá de esa fecha). */
export const refDate = new Date(dataset.meta.generadoEl);
