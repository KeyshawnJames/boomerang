import type { CreateReturnRequest, LabelType } from "api";
import { create } from "zustand";

// The uri shows the photo again after Back; only the key goes to POST /returns.
export type Photo = { key: string; uri: string };

type Draft = {
  retailerId: string | null;
  labelType: LabelType | null;
  carrier: CreateReturnRequest["carrier"] | null;
  orderNumber: string;
  labelPhoto: Photo | null;
  packagePhoto: Photo | null;
};

const empty: Draft = {
  retailerId: null,
  labelType: null,
  carrier: null,
  orderNumber: "",
  labelPhoto: null,
  packagePhoto: null,
};

// The return being booked, kept across the steps so Back loses nothing.
export const useDraft = create<
  Draft & { update: (changes: Partial<Draft>) => void; reset: () => void }
>()((set) => ({
  ...empty,
  update: (changes) => set(changes),
  reset: () => set(empty),
}));
