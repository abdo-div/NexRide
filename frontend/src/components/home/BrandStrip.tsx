import React from "react";
import { useTranslation } from "react-i18next";

const BRANDS = [
  { name: "Mercedes-Benz", logo: "/brands/mercedes-benz-logo.svg" },
  { name: "BMW", logo: "/brands/bmw-logo.svg" },
  { name: "Toyota", logo: "/brands/toyota-logo.svg" },
  { name: "Audi", logo: "/brands/audi-logo.svg" },
  { name: "Hyundai", logo: "/brands/hyundai-logo.svg" },
  { name: "Kia", logo: "/brands/kia-logo.svg" },
  { name: "Lexus", logo: "/brands/lexus-logo.png" },
  { name: "Ford", logo: "/brands/ford-logo.png" },
] as const;

const BrandGroup = ({ hidden = false }: { hidden?: boolean }) => (
  <div className="flex shrink-0 items-center justify-around gap-10 px-5 md:gap-14 md:px-7" aria-hidden={hidden || undefined}>
    {BRANDS.map((brand) => (
      <div key={brand.name} className="group flex w-28 shrink-0 flex-col items-center gap-3 text-center">
        <span className="grid h-14 w-24 place-items-center transition duration-300 group-hover:scale-110">
          <img src={brand.logo} alt={hidden ? "" : `${brand.name} logo`} className="max-h-12 max-w-20 object-contain" loading="lazy" />
        </span>
        <span className="text-[11px] font-bold text-slate-700">{brand.name}</span>
      </div>
    ))}
  </div>
);

export const BrandStrip: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="overflow-hidden border-b border-slate-200 bg-white py-9">
      <div className="mx-auto mb-7 flex max-w-7xl items-end justify-between gap-4 px-6 lg:px-12">
        <div>
          <h2 className="text-xl font-black tracking-tight text-blue-600">{t("home.brandStrip.title")}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">{t("home.brandStrip.subtitle")}</p>
        </div>
      </div>
      <div className="brand-marquee overflow-hidden" dir="ltr">
        <div className="brand-marquee-track flex w-max">
          <BrandGroup />
          <BrandGroup hidden />
        </div>
      </div>
    </section>
  );
};

export default BrandStrip;
