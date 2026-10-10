import { createContext, useContext } from "react";

export interface AdminHubValue {
  /** Selected dispatch hub ('' = all hubs). */
  hub: string;
  setHub: (hub: string) => void;
}

export const AdminHubContext = createContext<AdminHubValue>({
  hub: "",
  setHub: () => undefined,
});

export const useAdminHub = (): AdminHubValue => useContext(AdminHubContext);