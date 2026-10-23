/**
 * Keeps an authenticated staff member in public-website preview mode while
 * navigating between public pages. The query parameter must come before a
 * hash so React Router and the browser both preserve the intended section.
 */
export const publicWebsiteHref = (href: string, preview: boolean): string => {
  if (!preview) return href;

  const [pathAndQuery, hash] = href.split("#", 2);
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  const destination = `${pathAndQuery}${separator}preview=website`;
  return hash ? `${destination}#${hash}` : destination;
};
