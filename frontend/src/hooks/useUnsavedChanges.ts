import { useEffect } from "react";

/** Warns before a tab refresh or close would discard an in-progress form. */
export const useUnsavedChanges = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);
};
