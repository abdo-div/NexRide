import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { companySettingsApi } from "../lib/companySettingsApi";
import type {
  CompanySettingsData,
  CompanySettingsPasswordInput,
  CompanySettingsPatch,
  CompanySettingsProfile,
} from "../types/companySettings";

const EMPTY_PROFILE: CompanySettingsProfile = {
  _id: "",
  name: "",
  subdomain: "",
  slug: "",
  description: "",
  logo: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  commercialRegisterNumber: "",
  status: "PENDING",
  approvedAt: null,
  createdAt: null,
  customCommissionRate: null,
};

/** Fields the operator can actually persist via PATCH /companies/settings. */
const EDITABLE_FIELDS = [
  "name",
  "description",
  "email",
  "phone",
  "city",
  "address",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export interface SettingsMutationResult {
  ok: boolean;
  message: string;
}

const errorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : "";

/**
 * Drives the partner Company Settings page. Fetches the tenant-scoped settings
 * deck once, keeps an editable draft of the persistable profile fields, and
 * exposes the save + password mutations. `dirty`/`canSave` are derived so the
 * page never has to track form state itself.
 */
export const useCompanySettings = () => {
  const [data, setData] = useState<CompanySettingsData | null>(null);
  const [draft, setDraft] = useState<CompanySettingsProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companySettingsApi.get(controller.signal);
        if (!active) return;
        setData(response.data?.settings ?? null);
        setDraft(response.data?.settings?.profile ?? EMPTY_PROFILE);
      } catch {
        if (!active) return;
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const updateDraft = useCallback((field: EditableField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const dirty = useMemo(() => {
    if (!data) return false;
    return EDITABLE_FIELDS.some(
      (field) => (draft[field] ?? "") !== (data.profile[field] ?? ""),
    );
  }, [draft, data]);

  const canSave = useMemo(() => {
    if (!dirty) return false;
    return ["name", "email", "phone", "city", "address"].every(
      (field) => String(draft[field as EditableField] ?? "").trim().length > 0,
    );
  }, [dirty, draft]);

  const saveProfile = useCallback(async (): Promise<SettingsMutationResult> => {
    const patch: CompanySettingsPatch = EDITABLE_FIELDS.reduce(
      (acc, field) => ({ ...acc, [field]: draft[field] ?? "" }),
      {},
    );

    setBusy(true);
    try {
      await companySettingsApi.updateProfile(patch);
      setAttempt((n) => n + 1);
      return { ok: true, message: "" };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    } finally {
      setBusy(false);
    }
  }, [draft]);

  const changePassword = useCallback(
    async (input: CompanySettingsPasswordInput): Promise<SettingsMutationResult> => {
      setBusy(true);
      try {
        await companySettingsApi.updatePassword(input);
        return { ok: true, message: "" };
      } catch (error) {
        return { ok: false, message: errorMessage(error) };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    data,
    draft,
    loading,
    error,
    busy,
    dirty,
    canSave,
    reload,
    updateDraft,
    saveProfile,
    changePassword,
  };
};