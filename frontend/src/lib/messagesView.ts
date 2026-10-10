/**
 * Pure, locale-aware formatters for the Messages workspace. Everything here is
 * deterministic (absolute calendar formatting); nothing reads the clock during
 * render, which keeps the timeline safe under the react-hooks/purity rules.
 */

export const messageTimeLabel = (iso: string | null, lang: string): string => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

export const messageDayLabel = (iso: string | null, lang: string): string => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

export const conversationListTime = (
  iso: string | null,
  lang: string,
): string => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

export const rangeLabel = (
  startIso: string | null,
  endIso: string | null,
  lang: string,
): string => {
  if (!startIso || !endIso) return "";
  try {
    return `${new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "short",
    }).format(new Date(startIso))} → ${new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "short",
    }).format(new Date(endIso))}`;
  } catch {
    return "";
  }
};