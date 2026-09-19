import React from "react";
import { Link } from "react-router";
import { Car, Share2, Heart, Download } from "lucide-react";

interface Props {
  crumbs: string[];
  saved: boolean;
  onToggleSave: () => void;
}

const Separator = () => <span className="text-[#CBD5E1]">/</span>;

export const DetailBreadcrumbs: React.FC<Props> = ({ crumbs, saved, onToggleSave }) => {
  const [copied, setCopied] = React.useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-6">
      <nav className="flex items-center gap-2 text-[#64748B] font-medium text-[13px] overflow-x-auto py-1">
        <Link
          to="/FleetPage"
          className="hover:text-[#2563EB] transition-colors flex items-center gap-1 shrink-0"
        >
          <Car className="w-4 h-4" />
          {crumbs[0] ?? "Cars"}
        </Link>
        {crumbs.slice(1, -1).map((c) => (
          <React.Fragment key={c}>
            <Separator />
            <Link to="/FleetPage" className="hover:text-[#2563EB] transition-colors shrink-0">
              {c}
            </Link>
          </React.Fragment>
        ))}
        <Separator />
        <span className="text-[#0F172A] font-semibold truncate">
          {crumbs[crumbs.length - 1] ?? ""}
        </span>
      </nav>

      <div className="flex items-center gap-2 self-start md:self-auto">
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors shadow-sm text-[13px] font-medium"
        >
          <Share2 className="w-[18px] h-[18px]" />
          {copied ? "Link Copied!" : "Share"}
        </button>
        <button
          type="button"
          onClick={onToggleSave}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-sm text-[13px] font-medium ${
            saved ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <Heart className={`w-[18px] h-[18px] ${saved ? "fill-[#2563EB] text-[#2563EB]" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors shadow-sm text-[13px] font-medium"
        >
          <Download className="w-[18px] h-[18px]" />
          Terms Sheet
        </button>
      </div>
    </div>
  );
};