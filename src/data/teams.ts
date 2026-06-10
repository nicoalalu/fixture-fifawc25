import type { Team } from "../types";

// Las 48 selecciones clasificadas al Mundial 2026 (grupos del sorteo del 5-dic-2025).
// Fuente: §2 de la spec. El rankingFIFA es aproximado y se usa también como
// "fuerza" relativa al simular el dataset (ver scripts/build-dataset.ts).
//
// NOTA: verificar contra la fuente oficial FIFA antes de cerrar el dataset.
// Los ganadores de repechaje (CZE, BIH, TUR, SWE, IRQ, COD) son los más sensibles.

interface TeamSeed {
  id: string;
  nombre: string;
  codigoFIFA: string;
  confederacion: Team["confederacion"];
  grupo: Team["grupo"];
  bandera: string;
  rankingFIFA: number;
}

export const TEAMS: TeamSeed[] = [
  // Grupo A
  { id: "mex", nombre: "México", codigoFIFA: "MEX", confederacion: "CONCACAF", grupo: "A", bandera: "🇲🇽", rankingFIFA: 16 },
  { id: "rsa", nombre: "Sudáfrica", codigoFIFA: "RSA", confederacion: "CAF", grupo: "A", bandera: "🇿🇦", rankingFIFA: 59 },
  { id: "kor", nombre: "Corea del Sur", codigoFIFA: "KOR", confederacion: "AFC", grupo: "A", bandera: "🇰🇷", rankingFIFA: 22 },
  { id: "cze", nombre: "República Checa", codigoFIFA: "CZE", confederacion: "UEFA", grupo: "A", bandera: "🇨🇿", rankingFIFA: 36 },

  // Grupo B
  { id: "can", nombre: "Canadá", codigoFIFA: "CAN", confederacion: "CONCACAF", grupo: "B", bandera: "🇨🇦", rankingFIFA: 30 },
  { id: "sui", nombre: "Suiza", codigoFIFA: "SUI", confederacion: "UEFA", grupo: "B", bandera: "🇨🇭", rankingFIFA: 19 },
  { id: "qat", nombre: "Catar", codigoFIFA: "QAT", confederacion: "AFC", grupo: "B", bandera: "🇶🇦", rankingFIFA: 37 },
  { id: "bih", nombre: "Bosnia y Herzegovina", codigoFIFA: "BIH", confederacion: "UEFA", grupo: "B", bandera: "🇧🇦", rankingFIFA: 75 },

  // Grupo C
  { id: "bra", nombre: "Brasil", codigoFIFA: "BRA", confederacion: "CONMEBOL", grupo: "C", bandera: "🇧🇷", rankingFIFA: 5 },
  { id: "mar", nombre: "Marruecos", codigoFIFA: "MAR", confederacion: "CAF", grupo: "C", bandera: "🇲🇦", rankingFIFA: 13 },
  { id: "sco", nombre: "Escocia", codigoFIFA: "SCO", confederacion: "UEFA", grupo: "C", bandera: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", rankingFIFA: 33 },
  { id: "hai", nombre: "Haití", codigoFIFA: "HAI", confederacion: "CONCACAF", grupo: "C", bandera: "🇭🇹", rankingFIFA: 90 },

  // Grupo D
  { id: "usa", nombre: "Estados Unidos", codigoFIFA: "USA", confederacion: "CONCACAF", grupo: "D", bandera: "🇺🇸", rankingFIFA: 15 },
  { id: "aus", nombre: "Australia", codigoFIFA: "AUS", confederacion: "AFC", grupo: "D", bandera: "🇦🇺", rankingFIFA: 24 },
  { id: "par", nombre: "Paraguay", codigoFIFA: "PAR", confederacion: "CONMEBOL", grupo: "D", bandera: "🇵🇾", rankingFIFA: 35 },
  { id: "tur", nombre: "Turquía", codigoFIFA: "TUR", confederacion: "UEFA", grupo: "D", bandera: "🇹🇷", rankingFIFA: 27 },

  // Grupo E
  { id: "ger", nombre: "Alemania", codigoFIFA: "GER", confederacion: "UEFA", grupo: "E", bandera: "🇩🇪", rankingFIFA: 9 },
  { id: "ecu", nombre: "Ecuador", codigoFIFA: "ECU", confederacion: "CONMEBOL", grupo: "E", bandera: "🇪🇨", rankingFIFA: 23 },
  { id: "civ", nombre: "Costa de Marfil", codigoFIFA: "CIV", confederacion: "CAF", grupo: "E", bandera: "🇨🇮", rankingFIFA: 40 },
  { id: "cuw", nombre: "Curazao", codigoFIFA: "CUW", confederacion: "CONCACAF", grupo: "E", bandera: "🇨🇼", rankingFIFA: 85 },

  // Grupo F
  { id: "ned", nombre: "Países Bajos", codigoFIFA: "NED", confederacion: "UEFA", grupo: "F", bandera: "🇳🇱", rankingFIFA: 7 },
  { id: "jpn", nombre: "Japón", codigoFIFA: "JPN", confederacion: "AFC", grupo: "F", bandera: "🇯🇵", rankingFIFA: 18 },
  { id: "tun", nombre: "Túnez", codigoFIFA: "TUN", confederacion: "CAF", grupo: "F", bandera: "🇹🇳", rankingFIFA: 41 },
  { id: "swe", nombre: "Suecia", codigoFIFA: "SWE", confederacion: "UEFA", grupo: "F", bandera: "🇸🇪", rankingFIFA: 25 },

  // Grupo G
  { id: "bel", nombre: "Bélgica", codigoFIFA: "BEL", confederacion: "UEFA", grupo: "G", bandera: "🇧🇪", rankingFIFA: 8 },
  { id: "irn", nombre: "Irán", codigoFIFA: "IRN", confederacion: "AFC", grupo: "G", bandera: "🇮🇷", rankingFIFA: 20 },
  { id: "egy", nombre: "Egipto", codigoFIFA: "EGY", confederacion: "CAF", grupo: "G", bandera: "🇪🇬", rankingFIFA: 32 },
  { id: "nzl", nombre: "Nueva Zelanda", codigoFIFA: "NZL", confederacion: "OFC", grupo: "G", bandera: "🇳🇿", rankingFIFA: 89 },

  // Grupo H
  { id: "esp", nombre: "España", codigoFIFA: "ESP", confederacion: "UEFA", grupo: "H", bandera: "🇪🇸", rankingFIFA: 3 },
  { id: "uru", nombre: "Uruguay", codigoFIFA: "URU", confederacion: "CONMEBOL", grupo: "H", bandera: "🇺🇾", rankingFIFA: 12 },
  { id: "ksa", nombre: "Arabia Saudita", codigoFIFA: "KSA", confederacion: "AFC", grupo: "H", bandera: "🇸🇦", rankingFIFA: 55 },
  { id: "cpv", nombre: "Cabo Verde", codigoFIFA: "CPV", confederacion: "CAF", grupo: "H", bandera: "🇨🇻", rankingFIFA: 70 },

  // Grupo I
  { id: "fra", nombre: "Francia", codigoFIFA: "FRA", confederacion: "UEFA", grupo: "I", bandera: "🇫🇷", rankingFIFA: 2 },
  { id: "sen", nombre: "Senegal", codigoFIFA: "SEN", confederacion: "CAF", grupo: "I", bandera: "🇸🇳", rankingFIFA: 17 },
  { id: "nor", nombre: "Noruega", codigoFIFA: "NOR", confederacion: "UEFA", grupo: "I", bandera: "🇳🇴", rankingFIFA: 26 },
  { id: "irq", nombre: "Irak", codigoFIFA: "IRQ", confederacion: "AFC", grupo: "I", bandera: "🇮🇶", rankingFIFA: 58 },

  // Grupo J
  { id: "arg", nombre: "Argentina", codigoFIFA: "ARG", confederacion: "CONMEBOL", grupo: "J", bandera: "🇦🇷", rankingFIFA: 1 },
  { id: "aut", nombre: "Austria", codigoFIFA: "AUT", confederacion: "UEFA", grupo: "J", bandera: "🇦🇹", rankingFIFA: 21 },
  { id: "alg", nombre: "Argelia", codigoFIFA: "ALG", confederacion: "CAF", grupo: "J", bandera: "🇩🇿", rankingFIFA: 38 },
  { id: "jor", nombre: "Jordania", codigoFIFA: "JOR", confederacion: "AFC", grupo: "J", bandera: "🇯🇴", rankingFIFA: 62 },

  // Grupo K
  { id: "por", nombre: "Portugal", codigoFIFA: "POR", confederacion: "UEFA", grupo: "K", bandera: "🇵🇹", rankingFIFA: 6 },
  { id: "col", nombre: "Colombia", codigoFIFA: "COL", confederacion: "CONMEBOL", grupo: "K", bandera: "🇨🇴", rankingFIFA: 14 },
  { id: "uzb", nombre: "Uzbekistán", codigoFIFA: "UZB", confederacion: "AFC", grupo: "K", bandera: "🇺🇿", rankingFIFA: 57 },
  { id: "cod", nombre: "RD del Congo", codigoFIFA: "COD", confederacion: "CAF", grupo: "K", bandera: "🇨🇩", rankingFIFA: 56 },

  // Grupo L
  { id: "eng", nombre: "Inglaterra", codigoFIFA: "ENG", confederacion: "UEFA", grupo: "L", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", rankingFIFA: 4 },
  { id: "cro", nombre: "Croacia", codigoFIFA: "CRO", confederacion: "UEFA", grupo: "L", bandera: "🇭🇷", rankingFIFA: 10 },
  { id: "pan", nombre: "Panamá", codigoFIFA: "PAN", confederacion: "CONCACAF", grupo: "L", bandera: "🇵🇦", rankingFIFA: 31 },
  { id: "gha", nombre: "Ghana", codigoFIFA: "GHA", confederacion: "CAF", grupo: "L", bandera: "🇬🇭", rankingFIFA: 73 },
];
