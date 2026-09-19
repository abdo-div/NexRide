import React from "react";
import {
  PlaneLanding,
  PlaneTakeoff,
  Clock,
  Timer,
  BadgeCheck,
  CalendarDays,
  Shield,
  Lock,
  CreditCard,
  Banknote,
  Wallet,
  MessageSquare,
  FileCheck,
  RefreshCcw,
  CalendarCheck,
  Car,
  Headphones,
  HelpCircle,
  CheckCircle2,
  Star,
} from "lucide-react";
import type { CheckoutIconKey } from "../../types/checkout";

const ICONS: Record<CheckoutIconKey, React.ComponentType<{ className?: string }>> = {
  land: PlaneLanding,
  takeoff: PlaneTakeoff,
  clock: Clock,
  timer: Timer,
  verified: BadgeCheck,
  calendar: CalendarDays,
  shield: Shield,
  lock: Lock,
  credit: CreditCard,
  payments: Banknote,
  wallet: Wallet,
  sms: MessageSquare,
  policy: FileCheck,
  lockReset: RefreshCcw,
  event: CalendarCheck,
  car: Car,
  support: Headphones,
  help: HelpCircle,
  check: CheckCircle2,
  star: Star,
};

export const CheckoutIcon: React.FC<{ name: CheckoutIconKey; className?: string }> = ({
  name,
  className,
}) => {
  const Icon = ICONS[name];
  return <Icon className={className} />;
};