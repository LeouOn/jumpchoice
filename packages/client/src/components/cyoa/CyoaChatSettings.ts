export interface CyoaDifficulty {
  directorAggression: number;      // 1-5
  worldEscalation: number;         // 1-5
  informationLeakage: number;      // 1-5
  adversaryEnabled: boolean;
  stealthDisabled: boolean;
}

export interface CyoaCharacter {
  name: string;
  background: string;
  personaId: string | null;
}

export interface CyoaChatSettings {
  isCyoa: true;
  difficulty: CyoaDifficulty;
  character: CyoaCharacter;
  buildId: string;
  documentId: string;
  directorsCutEnabled?: boolean;
}

export const DEFAULT_CYOA_DIFFICULTY: CyoaDifficulty = {
  directorAggression: 3,
  worldEscalation: 4,
  informationLeakage: 3,
  adversaryEnabled: true,
  stealthDisabled: false,
};

export const DIFFICULTY_LABELS = {
  directorAggression: {
    1: "Passive",
    2: "Cautious",
    3: "Active",
    4: "Ruthless",
    5: "Merciless",
  },
  worldEscalation: {
    1: "Glacial",
    2: "Slow",
    3: "Medium",
    4: "Fast",
    5: "Relentless",
  },
  informationLeakage: {
    1: "Open",
    2: "Forthcoming",
    3: "Restricted",
    4: "Paranoid",
    5: "Blackout",
  },
} as const;
