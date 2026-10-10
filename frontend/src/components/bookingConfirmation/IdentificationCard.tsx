import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, MessageSquare, Mail } from "lucide-react";
import type { ConfirmationMeta } from "../../types/bookingConfirmation";

export const IdentificationCard: React.FC<{ meta: ConfirmationMeta }> = ({ meta }) => {
  const { t } = useTranslation();
  const { identification } = meta;
  const cards = [
    {
      key: "driver",
      label: "booking.identification.primaryDriver",
      value: identification.driverName,
      note: "booking.identification.noteVerified",
      noteIcon: <CheckCircle2 className="w-[14px] h-[14px]" />,
      primary: true,
    },
    {
      key: "hotline",
      label: "booking.identification.dispatchHotline",
      value: identification.hotline,
      note: "booking.identification.noteSms",
      noteIcon: <MessageSquare className="w-[14px] h-[14px]" />,
      primary: false,
    },
    {
      key: "email",
      label: "booking.identification.emailDelivery",
      value: identification.email,
      note: "booking.identification.noteToken",
      noteIcon: <Mail className="w-[14px] h-[14px]" />,
      primary: true,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-4">
      <h3 className="text-[18px] text-[#0F172A] font-bold">{t(identification.title)}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.key} className="p-3.5 rounded-xl bg-[#F8FAFC] flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-[#64748B]">
              {t(card.label)}
            </span>
            <span className="text-[16px] text-[#0F172A] font-bold truncate">{card.value}</span>
            <span
              className={`text-[11px] flex items-center gap-1 mt-1 ${
                card.primary ? "text-[#2563EB]" : "text-[#64748B]"
              }`}
            >
              {card.noteIcon}
              {t(card.note)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};