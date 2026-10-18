import { createContext } from "react";

export interface DialogOptions {
  tone?: "default" | "danger";
  confirmLabel?: string;
  placeholder?: string;
  initialValue?: string;
}

export interface DialogApi {
  confirm: (message: string, options?: DialogOptions) => Promise<boolean>;
  prompt: (message: string, options?: DialogOptions) => Promise<string | null>;
}

export const DialogContext = createContext<DialogApi | null>(null);
