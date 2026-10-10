import React from "react";
import { useTranslation } from "react-i18next";
import {
  CarFront,
  Check,
  Plus,
  Store,
  Plane,
  Trash2,
} from "lucide-react";
import type { PartnerApplicationDraft, DepotDraft } from "../../../types/companyApplication";
import {
  CANCELLATION_POLICIES,
  DEPOT_TYPES,
  FLEET_TIERS,
  HUB_CITIES,
  MAX_DURATION_DAYS,
  MIN_DRIVER_AGES,
  MIN_DURATION_DAYS,
  VEHICLE_CATEGORIES,
} from "../../../lib/partnerApplicationView";
import { LabeledField, SelectInput, TextInput, Toggle } from "./inputs";

interface Props {
  draft: PartnerApplicationDraft;
  setDraft: React.Dispatch<React.SetStateAction<PartnerApplicationDraft>>;
  errors: Record<string, string>;
}

const emptyDepot = (): DepotDraft => ({
  name: "",
  address: "",
  hubType: "BRANCH",
  phone: "",
  hours: "",
});

const depotIcon = (hubType: DepotDraft["hubType"]) =>
  hubType === "AIRPORT_TERMINAL" ? Plane : Store;

export const RentalBusinessStep: React.FC<Props> = ({ draft, setDraft, errors }) => {
  const { t } = useTranslation();

  const patchFleet = (partial: Partial<PartnerApplicationDraft["fleet"]>) =>
    setDraft((current) => ({
      ...current,
      fleet: { ...current.fleet, ...partial },
    }));

  const patchHubs = (partial: Partial<PartnerApplicationDraft["hubs"]>) =>
    setDraft((current) => ({
      ...current,
      hubs: { ...current.hubs, ...partial },
    }));

  const patchPolicy = (partial: Partial<PartnerApplicationDraft["policy"]>) =>
    setDraft((current) => ({
      ...current,
      policy: { ...current.policy, ...partial },
    }));

  const toggleCategory = (category: (typeof VEHICLE_CATEGORIES)[number]) =>
    patchFleet({
      categories: draft.fleet.categories.includes(category)
        ? draft.fleet.categories.filter((item) => item !== category)
        : [...draft.fleet.categories, category],
    });

  const toggleHub = (hub: (typeof HUB_CITIES)[number]) =>
    patchHubs({
      active: draft.hubs.active.includes(hub)
        ? draft.hubs.active.filter((item) => item !== hub)
        : [...draft.hubs.active, hub],
    });

  const patchDepot = (index: number, partial: Partial<DepotDraft>) =>
    patchHubs({
      depots: draft.hubs.depots.map((depot, i) =>
        i === index ? { ...depot, ...partial } : depot,
      ),
    });

  const addDepot = () =>
    patchHubs({ depots: [...draft.hubs.depots, emptyDepot()] });

  const removeDepot = (index: number) =>
    patchHubs({
      depots: draft.hubs.depots.filter((_, i) => i !== index),
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 font-bold text-lg">
          3
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0B1C30]">{t("partner.step3.title")}</h3>
          <p className="text-[13px] text-[#434655]">{t("partner.step3.subtitle")}</p>
        </div>
      </div>

      {/* 3.1 Fleet size */}
      <div className="flex flex-col gap-2.5">
        <label className="flex items-center justify-between text-sm font-bold text-[#0B1C30]">
          <span className="flex items-center gap-2">
            <CarFront className="w-4 h-4 text-[#2563EB]" />
            {t("partner.step3.fleetSize")}
          </span>
          <span className="text-xs text-[#434655] font-normal">
            {t("partner.step3.fleetHint")}
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {FLEET_TIERS.map((tier) => {
            const selected = draft.fleet.tier === tier.value;
            return (
              <button
                key={tier.value}
                type="button"
                onClick={() => patchFleet({ tier: tier.value })}
                className={`px-3 py-3.5 rounded-xl text-[15px] font-semibold text-center transition-all cursor-pointer ${
                  selected
                    ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20"
                    : "bg-[#EFF4FF] text-[#0B1C30] hover:bg-[#E5EEFF]"
                }`}
              >
                {tier.range}
                <span
                  className={`block text-[11px] font-medium mt-0.5 ${
                    selected ? "text-white/85" : "text-[#565E74]"
                  }`}
                >
                  {t(`partner.step3.tiers.${tier.value}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3.2 Categories */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-bold text-[#0B1C30]">
          {t("partner.step3.categories")}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {VEHICLE_CATEGORIES.map((category) => {
            const selected = draft.fleet.categories.includes(category);
            return (
              <label
                key={category}
                className={`flex items-center gap-2 p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                  selected
                    ? "bg-[#E5EEFF] font-bold text-[#0B1C30]"
                    : "bg-[#EFF4FF] text-[#0B1C30] hover:bg-[#E5EEFF]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleCategory(category)}
                  className="w-4 h-4 rounded accent-[#2563EB]"
                />
                <span>{t(`partner.step3.categoryOptions.${category}`)}</span>
              </label>
            );
          })}
        </div>
        {errors.categories ? (
          <span className="text-[11px] font-semibold text-[#BA1A1A]">{errors.categories}</span>
        ) : null}
      </div>

      {/* 3.3 Operating hubs */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-bold text-[#0B1C30]">
          {t("partner.step3.hubs")}
        </label>
        <div className="flex flex-wrap gap-2.5">
          {HUB_CITIES.map((hub) => {
            const selected = draft.hubs.active.includes(hub);
            return (
              <button
                key={hub}
                type="button"
                onClick={() => toggleHub(hub)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  selected
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "bg-[#E5EEFF] text-[#434655] hover:bg-[#DCE9FF]"
                }`}
              >
                {selected ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{t(`partner.step3.cities.${hub}`)}</span>
                <span className={selected ? "text-white/70" : "text-[#737686]"}>
                  ({t(`partner.step3.cityAr.${hub}`)})
                </span>
              </button>
            );
          })}
        </div>
        {errors.hubs ? (
          <span className="text-[11px] font-semibold text-[#BA1A1A]">{errors.hubs}</span>
        ) : null}
      </div>

      {/* 3.4 Depots */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#0B1C30]">{t("partner.step3.depots")}</h4>
            <p className="text-xs text-[#434655] mt-0.5">{t("partner.step3.depotsHint")}</p>
          </div>
          <button
            type="button"
            onClick={addDepot}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] hover:underline cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("partner.step3.addDepot")}
          </button>
        </div>

        {draft.hubs.depots.map((depot, index) => {
          const DepotIcon = depotIcon(depot.hubType);
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-[#EFF4FF] shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DCE9FF] flex items-center justify-center shrink-0 text-[#2563EB]">
                  <DepotIcon className="w-[22px] h-[22px]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <LabeledField
                    label={`${t("partner.step3.depotName")} ${index + 1}`}
                    error={errors[`depots.${index}.name`]}
                  >
                    <TextInput
                      value={depot.name}
                      onChange={(name) => patchDepot(index, { name })}
                      placeholder={t("partner.step3.depotNamePlaceholder")}
                    />
                  </LabeledField>

                  <LabeledField
                    label={t("partner.step3.depotType")}
                  >
                    <SelectInput
                      value={depot.hubType}
                      onChange={(hubType) => patchDepot(index, { hubType: hubType as DepotDraft["hubType"] })}
                    >
                      {DEPOT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`partner.step3.depotTypes.${type}`)}
                        </option>
                      ))}
                    </SelectInput>
                  </LabeledField>

                  <div className="sm:col-span-2">
                    <LabeledField
                      label={t("partner.step3.depotAddress")}
                      error={errors[`depots.${index}.address`]}
                    >
                      <TextInput
                        value={depot.address}
                        onChange={(address) => patchDepot(index, { address })}
                        placeholder={t("partner.step3.depotAddressPlaceholder")}
                      />
                    </LabeledField>
                  </div>

                  <LabeledField label={t("partner.step3.depotPhone")}>
                    <TextInput
                      dir="ltr"
                      value={depot.phone}
                      onChange={(phone) => patchDepot(index, { phone })}
                      placeholder="+218"
                    />
                  </LabeledField>

                  <LabeledField label={t("partner.step3.depotHours")}>
                    <TextInput
                      dir="ltr"
                      value={depot.hours}
                      onChange={(hours) => patchDepot(index, { hours })}
                      placeholder="Sat–Thu: 08:00 – 20:00"
                    />
                  </LabeledField>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeDepot(index)}
                  className="p-1.5 rounded-lg text-[#737686] hover:bg-[#E5EEFF] hover:text-[#BA1A1A] transition-colors cursor-pointer"
                  aria-label={t("partner.step3.delete")}
                >
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          );
        })}

        {errors.depots ? (
          <span className="text-[11px] font-semibold text-[#BA1A1A]">{errors.depots}</span>
        ) : null}
      </div>

      {/* 3.5 Policies */}
      <div className="flex flex-col gap-4 pt-1">
        <h4 className="text-sm font-bold text-[#0B1C30]">{t("partner.step3.policies")}</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledField label={t("partner.step3.minDuration")}>
            <SelectInput
              value={draft.policy.minDurationDays}
              onChange={(value) => patchPolicy({ minDurationDays: Number(value) })}
            >
              {MIN_DURATION_DAYS.map((days) => (
                <option key={days} value={days}>
                  {t(`partner.step3.durations.${days}`)}
                </option>
              ))}
            </SelectInput>
          </LabeledField>

          <LabeledField label={t("partner.step3.maxDuration")}>
            <SelectInput
              value={draft.policy.maxDurationDays}
              onChange={(value) => patchPolicy({ maxDurationDays: Number(value) })}
            >
              {MAX_DURATION_DAYS.map((days) => (
                <option key={days} value={days}>
                  {t(`partner.step3.durations.${days}`)}
                </option>
              ))}
            </SelectInput>
          </LabeledField>

          <LabeledField label={t("partner.step3.minAge")}>
            <SelectInput
              value={draft.policy.minDriverAge}
              onChange={(value) => patchPolicy({ minDriverAge: Number(value) })}
            >
              {MIN_DRIVER_AGES.map((age) => (
                <option key={age} value={age}>
                  {t(`partner.step3.ages.${age}`)}
                </option>
              ))}
            </SelectInput>
          </LabeledField>

          <LabeledField label={t("partner.step3.cancellation")}>
            <SelectInput
              value={draft.policy.cancellationPolicy}
              onChange={(value) =>
                patchPolicy({ cancellationPolicy: value as PartnerApplicationDraft["policy"]["cancellationPolicy"] })
              }
            >
              {CANCELLATION_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {t(`partner.step3.cancellations.${policy}`)}
                </option>
              ))}
            </SelectInput>
          </LabeledField>
        </div>

        {errors.policyRange ? (
          <span className="text-[11px] font-semibold text-[#BA1A1A]">{errors.policyRange}</span>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <LabeledField label={t("partner.step3.deposit")}>
            <div className="flex items-center gap-2">
              <TextInput
                type="number"
                dir="ltr"
                value={String(draft.policy.depositAmountLYD)}
                onChange={(value) => patchPolicy({ depositAmountLYD: Number(value) || 0 })}
                className="text-[#2563EB] font-bold"
              />
              <span className="shrink-0 text-sm font-black text-[#2563EB]">LYD</span>
            </div>
            <span className="text-[11px] text-[#737686]">{t("partner.step3.depositHint")}</span>
          </LabeledField>

          <div className="p-4 rounded-xl bg-[#EFF4FF] flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-[#0B1C30] block">
                {t("partner.step3.additionalDriver")}
              </span>
              <span className="text-[11px] text-[#434655]">
                {t("partner.step3.additionalDriverHint")}
              </span>
            </div>
            <Toggle
              checked={draft.policy.additionalDriverAllowed}
              onChange={(additionalDriverAllowed) => patchPolicy({ additionalDriverAllowed })}
            />
          </div>

          <div className="p-4 rounded-xl bg-[#EFF4FF] flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-[#0B1C30] block">
                {t("partner.step3.smoking")}
              </span>
              <span className="text-[11px] text-[#434655]">{t("partner.step3.smokingHint")}</span>
            </div>
            <Toggle
              checked={draft.policy.inVehicleSmokingAllowed}
              onChange={(inVehicleSmokingAllowed) => patchPolicy({ inVehicleSmokingAllowed })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};