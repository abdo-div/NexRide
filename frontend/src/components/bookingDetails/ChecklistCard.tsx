import React from "react";
import { useTranslation } from "react-i18next";
import { CircleCheck, ListChecks } from "lucide-react";

export const ChecklistCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
      <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center">
          <ListChecks className="w-4 h-4" />
        </span>
        {t("bookingDetails.checklist.title")}
      </h2>
      <ol className="flex flex-col gap-2.5">
        {(t("bookingDetails.checklist.items", { returnObjects: true }) as string[]).map(
          (item: string, index: number) => (
            <li key={index} className="flex items-start gap-2.5">
              <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-[12.5px] text-[#475569] leading-relaxed">
                {item}
              </span>
            </li>
          ),
        )}
      </ol>
    </section>
  );
};

export default ChecklistCard;