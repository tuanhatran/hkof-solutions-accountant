import { beforeEach, describe, expect, it } from "vitest";
import type { CompanyDto } from "@/api/types";
import {
  COMPANY_STORAGE_KEY,
  resolveActiveCompanyId,
  useCompanyStore,
} from "./company";

const COMPANIES: CompanyDto[] = [
  { id: 1, name: "HKOF" },
  { id: 2, name: "Autre société" },
];

beforeEach(() => {
  localStorage.clear();
  useCompanyStore.setState({ activeCompanyId: null });
});

describe("useCompanyStore", () => {
  it("stores and clears the active company", () => {
    useCompanyStore.getState().setActiveCompany(2);
    expect(useCompanyStore.getState().activeCompanyId).toBe(2);

    useCompanyStore.getState().setActiveCompany(null);
    expect(useCompanyStore.getState().activeCompanyId).toBeNull();
  });

  it("persists the active company under the documented key", () => {
    useCompanyStore.getState().setActiveCompany(2);

    const stored = localStorage.getItem(COMPANY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state.activeCompanyId).toBe(2);
  });

  it("hydrates the active company from localStorage", async () => {
    localStorage.setItem(
      COMPANY_STORAGE_KEY,
      JSON.stringify({ state: { activeCompanyId: 7 }, version: 0 }),
    );

    await useCompanyStore.persist.rehydrate();

    expect(useCompanyStore.getState().activeCompanyId).toBe(7);
  });
});

describe("resolveActiveCompanyId", () => {
  it("keeps a stored company that still exists", () => {
    expect(resolveActiveCompanyId(2, COMPANIES)).toBe(2);
  });

  it("falls back to the first company when the stored id is unknown", () => {
    expect(resolveActiveCompanyId(99, COMPANIES)).toBe(1);
  });

  it("falls back to the first company when nothing is stored", () => {
    expect(resolveActiveCompanyId(null, COMPANIES)).toBe(1);
    expect(resolveActiveCompanyId(undefined, COMPANIES)).toBe(1);
  });

  it("returns null without any company", () => {
    expect(resolveActiveCompanyId(1, [])).toBeNull();
    expect(resolveActiveCompanyId(1, undefined)).toBeNull();
  });
});
