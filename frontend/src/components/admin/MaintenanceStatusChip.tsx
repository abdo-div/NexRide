import React from "react";
import { useTranslation } from "react-i18next";
import { Lock, Wrench, Clock, CheckCircle2 } from "lucide-react";
import type { MaintenanceDispatchStatus } from "../../types/admin";

interface MaintenanceStatusChipProps {
  status: MaintenanceDispatchStatus;
  showLock?: boolean;
}

/** Dispatch-readiness chip for the maintenance ledger. OVERDUE is derived. */
export const MaintenanceStatusChip: React.FC<MaintenanceStatusChipProps> = ({
  status,
  showLock = true,
}) => {
  const { t } = useTranslation();

  const config: Record<
    MaintenanceDispatchStatus,
    { tone: string; icon: React.ReactNode }
  > = {
    SCHEDULED: {
      tone: "bg-[#EFF4FF] text-[#2563EB]",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    IN_PROGRESS: {
      tone: "bg-amber-50 text-amber-700",
      icon: <Wrench className="h-3.5 w-3.5" />,
    },
    COMPLETED: {
      tone: "bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    OVERDUE: {
      tone: "bg-red-50 text-[#BA1A1A]",
      icon: <Lock className="h-3.5 w-3.5" />,
    },
  };

  const { tone, icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      {icon}
      {t(`admin.maintenance.statuses.${status}`)}
      {status === "OVERDUE" && showLock && (
        <span className="rounded-full bg-[#BA1A1A] px-1.5 py-px text-[9px] font-extrabold tracking-wider text-white">
          {t("admin.maintenance.table.lockActive")}
        </span>
      )}
    </span>
  );
};

export default MaintenanceStatusChip;