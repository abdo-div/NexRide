import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { resolvePageMetadata } from "../../utils/pageMetadata";

function setMeta(selector: string, attribute: "name" | "property", value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = url;
}

export function PageMetadata() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const route = resolvePageMetadata(pathname);
    const title = t(`seo.${route.key}.title`);
    const description = t(`seo.${route.key}.description`);
    const canonicalUrl = new URL(pathname, window.location.origin).href;
    const imageUrl = new URL("/screen.png", window.location.origin).href;

    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      route.indexable ? "index, follow" : "noindex, nofollow",
    );
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta('meta[property="og:locale"]', "property", "og:locale", i18n.language.startsWith("ar") ? "ar_LY" : "en_US");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setCanonical(canonicalUrl);
  }, [i18n.language, pathname, t]);

  return null;
}
