import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, X } from "lucide-react";

interface CompanyBroadcastModalProps {
  open: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<boolean>;
}

export const CompanyBroadcastModal: React.FC<CompanyBroadcastModalProps> = ({
  open,
  sending,
  onClose,
  onSend,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  if (!open) return null;

  const close = () => {
    setText("");
    onClose();
  };

  const submit = async () => {
    const ok = await onSend(text);
    if (ok) setText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("company.messagesPage.broadcast.cancel")}
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-[#0B1C30]/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF4FF]">
              <Megaphone className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B1C30]">
                {t("company.messagesPage.broadcast.title")}
              </h2>
              <p className="text-[12px] text-[#8A93A6]">
                {t("company.messagesPage.broadcast.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("company.messagesPage.broadcast.cancel")}
            className="rounded-lg p-1.5 text-[#565E74] transition-colors hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          placeholder={t("company.messagesPage.broadcast.placeholder")}
          className="mt-5 w-full resize-y rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-3 text-[13px] text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:bg-white"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-xl bg-[#F1F5F9] px-4 py-2.5 text-sm font-semibold text-[#434655] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
          >
            {t("company.messagesPage.broadcast.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending || text.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            {sending
              ? t("company.messagesPage.broadcast.sending")
              : t("company.messagesPage.broadcast.send")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyBroadcastModal;