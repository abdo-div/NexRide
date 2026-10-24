import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { resolvePageMetadata } from "../../utils/pageMetadata";

export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { key } = resolvePageMetadata(pathname);
  const pageTitle = t(`seo.${key}.title`);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {t("accessibility.pageChanged", { title: pageTitle })}
    </div>
  );
}
