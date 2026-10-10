import React from "react";
import { Link } from "react-router";

interface NavBarLogoProps {
  onDark?: boolean;
}

export const NavBarLogo: React.FC<NavBarLogoProps> = () => {
  return (
    <Link
      to="/"
      aria-label="NexRide"
      className="group flex shrink-0 items-center"
    >
      <img
        src="/nexride-logo.png"
        alt="NexRide"
        className="h-10 w-auto max-w-[140px] object-contain transition-transform duration-200 group-hover:scale-[1.02] sm:h-11 sm:max-w-[165px]"
      />
    </Link>
  );
};

export default NavBarLogo;
