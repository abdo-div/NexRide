import React from "react";
import { AuthBreadcrumb } from "../components/auth/AuthBreadcrumb";
import { AuthFormPanel } from "../components/auth/AuthFormPanel";
import { AuthBrandShowcase } from "../components/auth/AuthBrandShowcase";
import { AuthTrustBadges } from "../components/auth/AuthTrustBadges";

export const AuthPage: React.FC = () => {
  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-12">
        <AuthBreadcrumb />

        {/* Master Layout Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Interactive Auth Form Panel */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <AuthFormPanel />
          </div>

          {/* Right Column: Editorial Brand Showcase Card */}
          <div className="lg:col-span-5">
            <AuthBrandShowcase />
          </div>
        </div>

        {/* Security Badges Footer Grid */}
        <AuthTrustBadges />
      </div>
    </div>
  );
};

export default AuthPage;