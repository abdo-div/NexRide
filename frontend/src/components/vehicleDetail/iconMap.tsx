import React from "react";
import {
  Settings,
  Zap,
  Armchair,
  Fuel,
  Compass,
  Luggage,
  ShieldCheck,
  Gauge,
  User,
  CreditCard,
  FileText,
  Map,
  Plane,
  Building2,
  BadgeCheck,
  CheckCircle2,
  Lock,
  LifeBuoy,
} from "lucide-react";
import type { DetailIconKey } from "../../types/vehicleDetail";

const MAP: Record<DetailIconKey, React.FC<{ className?: string }>> = {
  settings: Settings,
  zap: Zap,
  armchair: Armchair,
  fuel: Fuel,
  compass: Compass,
  luggage: Luggage,
  shield: ShieldCheck,
  gauge: Gauge,
  user: User,
  credit: CreditCard,
  docs: FileText,
  map: Map,
  plane: Plane,
  building: Building2,
  badge: BadgeCheck,
  check: CheckCircle2,
  lock: Lock,
  life: LifeBuoy,
};

export const DetailIcon: React.FC<{ name: DetailIconKey; className?: string }> = ({
  name,
  className,
}) => {
  const Icon = MAP[name] ?? BadgeCheck;
  return <Icon className={className} />;
};