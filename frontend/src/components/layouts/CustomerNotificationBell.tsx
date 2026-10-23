import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  notificationApi,
  type CustomerNotification,
} from "../../lib/notificationApi";

const relativeTime = (value: string, locale: string) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
};

export const CustomerNotificationBell: React.FC<{ onDark?: boolean }> = ({
  onDark = false,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    notificationApi
      .list()
      .then(({ data }) => {
        setItems(data.notifications);
        setUnread(data.unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const select = (item: CustomerNotification) => {
    if (!item.readAt) {
      void notificationApi.markRead(item._id);
      setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnread((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    if (item.actionUrl) navigate(item.actionUrl);
  };

  const markAll = () => {
    void notificationApi.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" onClick={() => { setOpen((value) => !value); if (!open) load(); }} aria-label={t("notifications.title")} aria-expanded={open} className={`relative grid h-10 w-10 place-items-center rounded-full transition-colors ${onDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute end-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute end-0 z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl" role="dialog" aria-label={t("notifications.title")}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-extrabold text-slate-900">{t("notifications.title")}</h2>
            {unread > 0 && <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-bold text-blue-600"><CheckCheck className="h-4 w-4" />{t("notifications.markAll")}</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">{t("notifications.loading")}</p> : items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">{t("notifications.empty")}</p> : items.map((item) => (
              <button key={item._id} type="button" onClick={() => select(item)} className={`block w-full border-b border-slate-50 px-4 py-3 text-start hover:bg-slate-50 ${item.readAt ? "bg-white" : "bg-blue-50/60"}`}>
                <span className="flex items-start gap-2">
                  {!item.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                  <span className="min-w-0">
                    <strong className="block text-sm text-slate-900">{item.title}</strong>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-600">{item.message}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{relativeTime(item.createdAt, i18n.language)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
