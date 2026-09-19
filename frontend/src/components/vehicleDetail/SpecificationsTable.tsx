import React from "react";
import { DetailIcon } from "./iconMap";
import type { SpecGroup } from "../../types/vehicleDetail";

export const SpecificationsTable: React.FC<{ groups: SpecGroup[] }> = ({ groups }) => (
  <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
    <h2 className="text-[20px] font-bold text-[#0F172A] mb-6">Detailed Technical Blueprint</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {groups.map((g) => (
        <div key={g.title} className="space-y-4">
          <div className="flex items-center gap-2 text-[#2563EB] text-[12px] font-bold uppercase tracking-wider pb-1 border-b border-[#E2E8F0]">
            <DetailIcon name={g.icon} className="w-[18px] h-[18px]" />
            <span>{g.title}</span>
          </div>
          <ul className="space-y-2.5 text-[13px] text-[#64748B]">
            {g.rows.map((r) => (
              <li
                key={r.label}
                className="flex justify-between bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl"
              >
                <span>{r.label}</span>
                <span
                  className={
                    r.accent ? "text-[#2563EB] font-bold" : "text-[#0F172A] font-semibold"
                  }
                >
                  {r.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);