export interface HowItWorksStep {
  stepNumber: string;
  iconType: "search" | "compare" | "reserve" | "drive";
  title: string;
  description: string;
  footerText: string;
}
