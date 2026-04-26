import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface SettingsConfig {
  company_name: string;
  project_id: string;
  brand_id: string;
}

interface Brand {
  id: string;
  name: string;
  domain?: string;
  domains?: string[];
  is_own?: boolean;
}

export interface CurrentSelection {
  projectId: string;
  brandId: string;
  brandName: string;
  companyName: string;
  isConfigured: boolean;
  isLoading: boolean;
}

/**
 * Single source of truth for the active Peec project + brand.
 * Backed by /api/settings/config (configured on the Settings page).
 * Pages should read from here instead of maintaining their own dropdowns.
 */
export function useCurrentSelection(): CurrentSelection {
  const { data: config, isLoading: loadingConfig } = useQuery<SettingsConfig>({
    queryKey: ["settings", "config"],
    queryFn: async () => (await axios.get("/api/settings/config")).data,
    staleTime: 30_000,
  });

  const projectId = config?.project_id ?? "";
  const brandId = config?.brand_id ?? "";

  const { data: brands, isLoading: loadingBrands } = useQuery<Brand[]>({
    queryKey: ["settings", "brands", projectId],
    queryFn: async () =>
      (await axios.get(`/api/settings/brands/${projectId}`)).data,
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const brandName = brands?.find((b) => b.id === brandId)?.name ?? "";

  return {
    projectId,
    brandId,
    brandName,
    companyName: config?.company_name ?? "",
    isConfigured: Boolean(projectId && brandId),
    isLoading: loadingConfig || loadingBrands,
  };
}
