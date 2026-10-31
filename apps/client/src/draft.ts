import type { CreateReturnRequest, LabelType } from "api";
import { create } from "zustand";

// The uri shows the photo again after Back; only the key goes to POST /returns.
export type Photo = { key: string; uri: string };

type Draft = {
  // Goes up on reset, so an upload from an abandoned draft can tell.
  id: number;
  retailerId: string | null;
  labelType: LabelType | null;
  carrier: CreateReturnRequest["carrier"] | null;
  orderNumber: string;
  labelPhoto: Photo | null;
  packagePhoto: Photo | null;
  // Eligibility answers by question code, and the question set they answer.
  answers: Record<string, string>;
  policyVersion: number | null;
  acknowledgedWarnings: boolean;
  attested: boolean;
};

const empty: Omit<Draft, "id"> = {
  retailerId: null,
  labelType: null,
  carrier: null,
  orderNumber: "",
  labelPhoto: null,
  packagePhoto: null,
  answers: {},
  policyVersion: null,
  acknowledgedWarnings: false,
  attested: false,
};

// The return being booked, kept across the steps so Back loses nothing.
export const useDraft = create<
  Draft & { update: (changes: Partial<Draft>) => void; reset: () => void }
>()((set) => ({
  ...empty,
  id: 0,
  update: (changes) => set(changes),
  reset: () => set((s) => ({ ...empty, id: s.id + 1 })),
}));
