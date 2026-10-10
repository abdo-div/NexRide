import React from "react";
import { useTranslation } from "react-i18next";
import {
  Verified,
  Lock,
  ShieldCheck,
  Headset,
} from "lucide-react";

export const AuthTrustBadges: React.FC = () => {
  const { t } = useTranslation();

  const BADGES = [
    {
      icon: Verified,
      title: t("auth.badges.identity"),
      subtitle: t("auth.badges.identitySub"),
    },
    {
      icon: Lock,
      title: t("auth.badges.encrypted"),
      subtitle: t("auth.badges.encryptedSub"),
    },
    {
      icon: ShieldCheck,
      title: t("auth.badges.protocol"),
      subtitle: t("auth.badges.protocolSub"),
    },
    {
      icon: Headset,
      title: t("auth.badges.dispatch"),
      subtitle: t("auth.badges.dispatchSub"),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-10 pt-5 bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0]">
      {BADGES.map((badge) => (
        <div key={badge.title} className="flex items-center gap-3">
          <badge.icon className="w-6 h-6 text-[#2563EB] flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#0F172A]">{badge.title}</p>
            <p className="text-[11px] text-slate-500">{badge.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuthTrustBadges;