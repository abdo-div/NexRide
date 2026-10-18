import { useContext } from "react";
import { DialogContext, type DialogApi } from "./dialogContextValue";

export const useDialog = (): DialogApi => {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialog must be used within DialogProvider");
  return context;
};
