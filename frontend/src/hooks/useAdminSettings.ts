import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type {
  PlatformGateways,
  PlatformGovernance,
  PlatformSettings,
  PlatformSettingsRegistry,
} from "../types/admin";

/**
 * Feeds the Platform Settings & Governance page from GET /admin/settings.
 * `save(patch)` persists partial sections (or `{ reset: true }`) through
 * PATCH and swaps the whole snapshot with the server's fresh response.
 */
export const useAdminSettings = (): {
  settings: PlatformSettings | null;
  registry: PlatformSettingsRegistry | null;
  gateways: PlatformGateways | null;
  governance: PlatformGovernance | null;
  loading: boolean;
  error: boolean;
  saving: boolean;
  reload: () => void;
  save: (
    patch: Parameters<typeof adminApi.updatePlatformSettings>[0],
  ) => Promise<PlatformSettings | null>;
} => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [registry, setRegistry] = useState<PlatformSettingsRegistry | null>(null);
  const [gateways, setGateways] = useState<PlatformGateways | null>(null);
  const [governance, setGovernance] = useState<PlatformGovernance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await adminApi.platformSettings(controller.signal);
        if (!active) return;
        setSettings(res.data.settings ?? null);
        setRegistry(res.data.registry ?? null);
        setGateways(res.data.gateways ?? null);
        setGovernance(res.data.governance ?? null);
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

  const save = useCallback(
    async (patch: Parameters<typeof adminApi.updatePlatformSettings>[0]) => {
      setSaving(true);
      try {
        const res = await adminApi.updatePlatformSettings(patch);
        setSettings(res.data.settings ?? null);
        setRegistry(res.data.registry ?? null);
        setGateways(res.data.gateways ?? null);
        setGovernance(res.data.governance ?? null);
        return res.data.settings ?? null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { settings, registry, gateways, governance, loading, error, saving, reload, save };
};