import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, CircleX, Hammer, Wrench } from "lucide-react";
import type {
  CreateMaintenancePayload,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStoredStatus,
} from "../../types/admin";
import type { VehicleDto } from "../../types/vehicle";
import { categoryOptions, priorityOptions } from "../../lib/maintenanceView";

export interface LogMaintenanceModalProps {
  vehicles: VehicleDto[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMaintenancePayload) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/** "+ Log Maintenance Event" — creates a quarantine record (locks the unit). */
export const LogMaintenanceModal: React.FC<LogMaintenanceModalProps> = ({
  vehicles,
  busy,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();

  const [vehicleId, setVehicleId] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory>("ROUTINE_SERVICE");
  const [priority, setPriority] = useState<MaintenancePriority>("ROUTINE");
  const [status, setStatus] = useState<MaintenanceStoredStatus>("SCHEDULED");
  const [triggerReason, setTriggerReason] = useState("");
  const [detail, setDetail] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [technician, setTechnician] = useState("");
  const [intakeDate, setIntakeDate] = useState(today);
  const [estReturnDate, setEstReturnDate] = useState("");
  const [estCost, setEstCost] = useState("");
  const [invalid, setInvalid] = useState("");

  const submit = () => {
    const cost = Number(estCost);
    if (!vehicleId || !triggerReason.trim() || Number.isNaN(cost) || cost < 0) {
      setInvalid(t("admin.maintenance.modal.required"));
      return;
    }
    setInvalid("");
    onSubmit({
      vehicleId,
      category,
      priority,
      status,
      triggerReason: triggerReason.trim(),
      detail: detail.trim() || undefined,
      workshop: workshop.trim() || undefined,
      technician: technician.trim() || undefined,
      intakeDate,
      estReturnDate: estReturnDate || null,
      estCost: cost,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-[0_20px_60px_rgba(8,19,31,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-[#0B1C30]">
                {t("admin.maintenance.modal.title")}
              </h2>
              <p className="text-xs text-[#565E74]">
                {t("admin.maintenance.modal.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
            aria-label="close"
          >
            <CircleX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
          <Field label={t("admin.maintenance.modal.vehicle")} required>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full cursor-pointer rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">{t("admin.maintenance.modal.vehiclePlaceholder")}</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {`${v.make} ${v.model} ${v.year ?? ""} • ${v.city}`}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t("admin.maintenance.modal.category")}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                className="w-full cursor-pointer rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {t(`admin.maintenance.categories.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.maintenance.modal.priority")}>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                className="w-full cursor-pointer rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {t(`admin.maintenance.priorities.${p}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.maintenance.modal.status")}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaintenanceStoredStatus)}
                className="w-full cursor-pointer rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="SCHEDULED">
                  {t("admin.maintenance.statuses.SCHEDULED")}
                </option>
                <option value="IN_PROGRESS">
                  {t("admin.maintenance.statuses.IN_PROGRESS")}
                </option>
              </select>
            </Field>
          </div>

          <Field label={t("admin.maintenance.modal.trigger")} required>
            <input
              value={triggerReason}
              onChange={(e) => setTriggerReason(e.target.value)}
              placeholder={t("admin.maintenance.modal.triggerPlaceholder")}
              className="w-full rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </Field>

          <Field label={t("admin.maintenance.modal.detail")}>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder={t("admin.maintenance.modal.detailPlaceholder")}
              className="w-full resize-none rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("admin.maintenance.modal.workshop")}>
              <input
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                placeholder={t("admin.maintenance.modal.workshopPlaceholder")}
                className="w-full rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              />
            </Field>
            <Field label={t("admin.maintenance.modal.technician")}>
              <input
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder={t("admin.maintenance.modal.technicianPlaceholder")}
                className="w-full rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t("admin.maintenance.modal.intakeDate")}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#565E74]">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={intakeDate}
                  onChange={(e) => setIntakeDate(e.target.value)}
                  className="w-full rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 pl-10 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </Field>
            <Field label={t("admin.maintenance.modal.estReturnDate")}>
              <input
                type="date"
                value={estReturnDate}
                onChange={(e) => setEstReturnDate(e.target.value)}
                className="w-full rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              />
            </Field>
            <Field label={t("admin.maintenance.modal.estCost")}>
              <input
                type="number"
                min={0}
                value={estCost}
                onChange={(e) => setEstCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl bg-[#EFF4FF] px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              />
            </Field>
          </div>

          {invalid && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-[#BA1A1A]">
              {invalid}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] transition-colors hover:bg-[#E5EEFF] disabled:opacity-50 cursor-pointer"
          >
            {t("admin.drawer.close")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors enabled:hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Hammer className="h-4 w-4" />
            {busy ? t("admin.maintenance.modal.saving") : t("admin.maintenance.modal.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
      {label}
      {required && <span className="ml-0.5 text-[#BA1A1A]">*</span>}
    </span>
    {children}
  </label>
);

export default LogMaintenanceModal;