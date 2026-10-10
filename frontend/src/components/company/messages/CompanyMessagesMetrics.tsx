import React from "react";
import { useTranslation } from "react-i18next";
import { BellRing, MessagesSquare, Smile, Timer } from "lucide-react";
import type { CompanyMessagesSummary } from "../../../types/companyMessages";

interface CompanyMessagesMetricsProps {
  summary: CompanyMessagesSummary;
  loading: boolean;
}

const Dashboard: React.FC<{
  icon: React.ReactNode;
  value: string;
  title: string;
  sub: string;
  tone: string;
}> = ({ icon, value, title, sub, tone }) => (
  <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[22px] font-extrabold leading-tight text-[#0B1C30]">
        {value}
      </p>
      <p className="text-[13px] font-bold text-[#434655]">{title}</p>
      <p className="mt-0.5 text-[11px] text-[#8A93A6]">{sub}</p>
    </div>
  </div>
);

export const CompanyMessagesMetrics: React.FC<CompanyMessagesMetricsProps> = ({
  summary,
  loading,
}) => {
  const { t } = useTranslation();

  const value = (input: string) => (loading ? "—" : input);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Dashboard
        icon={<MessagesSquare className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />}
        tone="bg-[#EFF4FF]"
        value={value(String(summary.active))}
        title={t("company.messagesPage.metrics.activeTitle")}
        sub={t("company.messagesPage.metrics.activeSub", {
          count: summary.total,
        })}
      />
      <Dashboard
        icon={<BellRing className="h-5 w-5 text-[#DC2626]" aria-hidden="true" />}
        tone="bg-[#FEF2F2]"
        value={value(String(summary.unreadMessages))}
        title={t("company.messagesPage.metrics.unreadTitle")}
        sub={t("company.messagesPage.metrics.unreadSub", {
          count: summary.unreadConversations,
        })}
      />
      <Dashboard
        icon={<Timer className="h-5 w-5 text-[#D97706]" aria-hidden="true" />}
        tone="bg-[#FFFBEB]"
        value={value(
          summary.avgFirstReplyMinutes === null
            ? "—"
            : t("company.messagesPage.metrics.minutes", {
                value: summary.avgFirstReplyMinutes,
              }),
        )}
        title={t("company.messagesPage.metrics.responseTitle")}
        sub={t("company.messagesPage.metrics.responseSub")}
      />
      <Dashboard
        icon={<Smile className="h-5 w-5 text-[#059669]" aria-hidden="true" />}
        tone="bg-[#ECFDF5]"
        value={value(
          summary.satisfactionPct === null
            ? "—"
            : `${summary.satisfactionPct}%`,
        )}
        title={t("company.messagesPage.metrics.satisfactionTitle")}
        sub={t("company.messagesPage.metrics.satisfactionSub")}
      />
    </div>
  );
};

export default CompanyMessagesMetrics;