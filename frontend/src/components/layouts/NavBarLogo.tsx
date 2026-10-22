import React from "react";
import { Link } from "react-router";

interface NavBarLogoProps {
  onDark?: boolean;
}

export const NavBarLogo: React.FC<NavBarLogoProps> = ({ onDark = false }) => {
  return (
    <Link
      to="/"
      aria-label="NexRide"
      className="group flex shrink-0 items-center"
    >
      {onDark ? (
        <img src="/nexride-logo-dark.png" alt="NexRide" className="h-10 w-auto max-w-[150px] object-contain transition-all duration-200 group-hover:scale-[1.02] sm:h-11 sm:max-w-[170px]" />
      ) : (
        <img src="/nexride-logo.png" alt="NexRide" className="h-10 w-auto max-w-[150px] object-contain transition-all duration-200 group-hover:scale-[1.02] sm:h-11 sm:max-w-[170px]" />
      )}
    </Link>
  );
};

export default NavBarLogo;
