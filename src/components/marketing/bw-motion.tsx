"use client";

import { type HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimationVariant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale-in"
  | "blur-in"
  | "slide-up"
  | "spring-in";

const EASE_PREMIUM: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const EASE_BOUNCE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

const variants: Record<
  AnimationVariant,
  { initial: Record<string, number | string>; animate: Record<string, number | string> }
> = {
  "fade-up": {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
  },
  "fade-down": {
    initial: { opacity: 0, y: -24 },
    animate: { opacity: 1, y: 0 },
  },
  "fade-left": {
    initial: { opacity: 0, x: -32 },
    animate: { opacity: 1, x: 0 },
  },
  "fade-right": {
    initial: { opacity: 0, x: 32 },
    animate: { opacity: 1, x: 0 },
  },
  "scale-in": {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
  },
  "blur-in": {
    initial: { opacity: 0, filter: "blur(8px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
  },
  "slide-up": {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
  },
  "spring-in": {
    initial: { opacity: 0, scale: 0.85, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0 },
  },
};

interface BwMotionProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate"> {
  children: React.ReactNode;
  variant?: AnimationVariant;
  delay?: number;
  duration?: number;
  className?: string;
  /** Use spring easing (bouncy) for spring-in and scale-in */
  bounce?: boolean;
  /** Custom viewport margin */
  margin?: string;
}

export function BwMotion({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 0.6,
  className,
  bounce = false,
  margin = "-60px",
  ...props
}: BwMotionProps) {
  const v = variants[variant];
  const ease: [number, number, number, number] = bounce || variant === "spring-in"
    ? EASE_BOUNCE
    : EASE_PREMIUM;

  return (
    <motion.div
      initial={v.initial}
      whileInView={v.animate}
      viewport={{ once: true, margin: margin as `${number}px` }}
      transition={{ duration, delay, ease }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
