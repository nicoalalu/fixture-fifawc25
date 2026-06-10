import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDataset } from "./validate-dataset.ts";
import type { Dataset } from "../src/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/dataset.json"), "utf8"),
) as Dataset;

describe("dataset snapshot (spec §7.5)", () => {
  it("tiene exactamente 48 selecciones clasificadas", () => {
    expect(ds.teams.filter((t) => t.qualified).length).toBe(48);
  });

  it("tiene 4 selecciones en cada uno de los 12 grupos", () => {
    const grupos = "ABCDEFGHIJKL".split("");
    for (const g of grupos) {
      expect(ds.teams.filter((t) => t.qualified && t.grupo === g).length).toBe(4);
    }
  });

  it("tiene 72 partidos de fase de grupos", () => {
    expect(ds.fixtures.length).toBe(72);
  });

  it("pasa la validación completa sin errores", () => {
    expect(validateDataset(ds)).toEqual([]);
  });
});
