import React, { useState } from "react";
import { Globe, Share2, MessageSquare, Phone } from "lucide-react";
import type { FooterSection } from "../../types/footer";

const EXPLORE_LINKS: FooterSection = {
  title: "EXPLORE",
  links: [
    { label: "Fleet Inventory", href: "#inventory" },
    { label: "Luxury & Armored", href: "#armored" },
    { label: "Libyan Locations", href: "#locations" },
    { label: "Instant Airport Deals", href: "#deals" },
    { label: "Diplomatic Chauffeur", href: "#chauffeur" },
  ],
};

const PARTNER_LINKS: FooterSection = {
  title: "FOR PARTNERS",
  links: [
    { label: "Fleet SaaS OS", href: "#saas" },
    { label: "Partner Portal Login", href: "#login" },
    { label: "Agency Guidelines", href: "#guidelines" },
    { label: "GPS & Telematics API", href: "#api" },
    { label: "Escrow & Payout Terms", href: "#terms" },
  ],
};

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert(`Subscribed ${email} to VIP alerts!`);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-[#020617] text-white">
      {/* Main Navigation & Info Footer */}
      <section className="pt-16 pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Info */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-black text-xl tracking-wider text-white">
                <span className="text-blue-500">NR</span> NEXRIDE
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-[10px] font-bold text-blue-400 font-mono">
                LY
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs mb-6">
              Your next ride, without the hassle. The premier automotive network
              engineered for Libyan roads, corporate expeditions, and airport
              handovers.
            </p>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Globe className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Explore Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black tracking-wider text-slate-200 uppercase mb-4">
              {EXPLORE_LINKS.title}
            </h4>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black tracking-wider text-slate-200 uppercase mb-4">
              {PARTNER_LINKS.title}
            </h4>
            <ul className="space-y-2.5">
              {PARTNER_LINKS.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* VIP Concierge & Newsletter Box */}
          <div className="lg:col-span-4">
            <h4 className="text-xs font-black tracking-wider text-slate-200 uppercase mb-2">
              VIP CONCIERGE & ALERTS
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mb-4">
              Stay updated on VIP arrivals, luxury catalog drops, and airport
              fleet allocations.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="flex items-center gap-2 mb-5"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your business email"
                className="w-full bg-[#0b1220] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 transition-colors"
              >
                Subscribe
              </button>
            </form>

            {/* Emergency Hotline Box */}
            <div className="bg-[#0b1220] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    24/7 Libyan Emergency Line
                  </span>
                  <span className="text-xs font-black text-white font-mono">
                    +218 (0) 21 000 8899
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-extrabold text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* 2. Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span>© 2026 NexRide Libya Mobility Technologies</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-semibold text-[11px]">
            <button className="hover:text-white transition-colors">EN</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">
              العربية
            </button>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              LYD (د.ل)
            </span>
          </div>
        </div>
      </section>
    </footer>
  );
};
