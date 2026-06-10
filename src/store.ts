import { create } from "zustand";
import { dataset, refDate } from "./lib/dataset";
import {
  buildTeamMatchIndex,
  headToHead,
  teamForm,
  teamMap,
  teamStats4Y,
} from "./lib/derive";
import { buildInsight } from "./lib/insights";
import type {
  HeadToHead,
  Insight,
  Team,
  TeamForm,
  TeamStats4Y,
} from "./types";

export type Tab = "selecciones" | "mundial";

// Índices construidos una sola vez al cargar.
const matchIndex = buildTeamMatchIndex(dataset);
const teams = teamMap(dataset);

interface AppState {
  tab: Tab;
  setTab: (t: Tab) => void;

  // Tab Selecciones
  selectedTeamId: string | null;
  selectTeam: (id: string | null) => void;
  filtroTexto: string;
  setFiltroTexto: (s: string) => void;

  // Tab Mundial: cruce activo (par de equipos en el modal H2H)
  cruce: { aId: string; bId: string } | null;
  abrirCruce: (aId: string, bId: string) => void;
  cerrarCruce: () => void;
}

export const useApp = create<AppState>((set) => ({
  tab: "selecciones",
  setTab: (tab) => set({ tab }),

  selectedTeamId: null,
  selectTeam: (selectedTeamId) => set({ selectedTeamId }),
  filtroTexto: "",
  setFiltroTexto: (filtroTexto) => set({ filtroTexto }),

  cruce: null,
  abrirCruce: (aId, bId) => set({ cruce: { aId, bId } }),
  cerrarCruce: () => set({ cruce: null }),
}));

// ---- Selectores derivados (no son hooks; se llaman con ids) -----------------

export function getTeam(id: string): Team | undefined {
  return teams.get(id);
}

/** Sólo las 48 clasificadas (la grilla y el selector libre no muestran
 *  rivales históricos no clasificados). */
export function getAllTeams(): Team[] {
  return dataset.teams.filter((t) => t.qualified);
}

export function getForm(teamId: string): TeamForm {
  return teamForm(matchIndex.get(teamId) ?? [], teamId, 10);
}

export function getStats(teamId: string): TeamStats4Y {
  return teamStats4Y(
    matchIndex.get(teamId) ?? [],
    teamId,
    dataset.meta.ventanaAniosStats,
    refDate,
  );
}

export function getH2H(aId: string, bId: string): HeadToHead {
  return headToHead(matchIndex.get(aId) ?? [], aId, bId);
}

export function getInsight(aId: string, bId: string): Insight {
  const h2h = getH2H(aId, bId);
  const a = teams.get(aId);
  const b = teams.get(bId);
  return buildInsight(h2h, { a: a?.nombre ?? aId, b: b?.nombre ?? bId });
}
