import type { Transition } from "framer-motion";

export const hoverSpring: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 26,
  mass: 0.75,
};

export const softHoverSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.8,
};

export const cardHover = {
  y: -7,
  scale: 1.012,
  transition: softHoverSpring,
};

export const buttonHover = {
  y: -2,
  scale: 1.025,
  transition: hoverSpring,
};

export const buttonTap = {
  y: 0,
  scale: 0.975,
  transition: hoverSpring,
};
