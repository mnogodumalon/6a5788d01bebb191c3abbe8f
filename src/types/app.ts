// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Personenpunkte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    kategorie?: LookupValue;
    punkte?: number;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  PERSONENPUNKTE: '6a5788bbc6266be51ca40b60',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'personenpunkte': {
    kategorie: [{ key: "bronze", label: "Bronze" }, { key: "silber", label: "Silber" }, { key: "gold", label: "Gold" }, { key: "platin", label: "Platin" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'personenpunkte': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'kategorie': 'lookup/select',
    'punkte': 'number',
    'bemerkung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreatePersonenpunkte = StripLookup<Personenpunkte['fields']>;