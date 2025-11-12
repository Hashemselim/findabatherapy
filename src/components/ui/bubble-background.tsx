"use client";

import * as React from "react";
import {
  MotionValue,
  SpringOptions,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import { cn } from "@/lib/utils";

type ColorConfig = {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  sixth: string;
};

type BubbleConfig = {
  size: number;
  floatX: number;
  floatY: number;
  duration: number;
  delay?: number;
  blur?: number;
  opacity: number;
  parallax: number;
  color: keyof ColorConfig;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
};

const DEFAULT_COLORS: ColorConfig = {
  first: "255, 255, 255",
  second: "255, 230, 140",
  third: "145, 182, 255",
  fourth: "255, 246, 210",
  fifth: "196, 214, 255",
  sixth: "232, 244, 255",
};

const DEFAULT_TRANSITION: SpringOptions = {
  stiffness: 120,
  damping: 20,
  mass: 0.5,
};

const BUBBLES: BubbleConfig[] = [
  {
    size: 360,
    floatX: 60,
    floatY: 50,
    duration: 36,
    opacity: 0.85,
    blur: 0,
    parallax: 0.2,
    color: "first",
    top: "-10%",
    left: "-5%",
  },
  {
    size: 280,
    floatX: 50,
    floatY: 40,
    duration: 32,
    delay: 2,
    opacity: 0.9,
    blur: 10,
    parallax: 0.35,
    color: "second",
    top: "5%",
    right: "-5%",
  },
  {
    size: 420,
    floatX: 40,
    floatY: 70,
    duration: 44,
    delay: 4,
    opacity: 0.8,
    blur: 20,
    parallax: 0.35,
    color: "third",
    bottom: "-25%",
    left: "-10%",
  },
  {
    size: 220,
    floatX: 35,
    floatY: 45,
    duration: 28,
    opacity: 0.85,
    blur: 8,
    parallax: 0.45,
    color: "fourth",
    top: "35%",
    left: "15%",
  },
  {
    size: 260,
    floatX: 55,
    floatY: 60,
    duration: 38,
    delay: 6,
    opacity: 0.9,
    blur: 12,
    parallax: 0.4,
    color: "fifth",
    bottom: "-10%",
    right: "5%",
  },
  {
    size: 180,
    floatX: 30,
    floatY: 30,
    duration: 26,
    opacity: 0.95,
    blur: 6,
    parallax: 0.5,
    color: "sixth",
    top: "20%",
    right: "25%",
  },
];

type BubbleBackgroundProps = {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: Partial<ColorConfig>;
};

export function BubbleBackground({
  children,
  className,
  interactive = true,
  transition = DEFAULT_TRANSITION,
  colors,
}: BubbleBackgroundProps) {
  const mergedColors = React.useMemo(
    () => ({ ...DEFAULT_COLORS, ...colors }),
    [colors],
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, transition);
  const springY = useSpring(pointerY, transition);
  const filterId = React.useId();

  React.useEffect(() => {
    if (!interactive) return;

    const node = containerRef.current;
    if (!node) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      pointerX.set(event.clientX - (rect.left + rect.width / 2));
      pointerY.set(event.clientY - (rect.top + rect.height / 2));
    };

    const handlePointerLeave = () => {
      pointerX.set(0);
      pointerY.set(0);
    };

    node.addEventListener("pointermove", handlePointerMove);
    node.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [interactive, pointerX, pointerY]);

  return (
    <div ref={containerRef} className={cn("relative isolate overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
      >
        {BUBBLES.map((bubble, index) => (
          <Bubble
            key={index}
            definition={bubble}
            color={mergedColors[bubble.color]}
            interactive={interactive}
            springX={springX}
            springY={springY}
          />
        ))}
        <svg className="absolute h-0 w-0">
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -15"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

type BubbleProps = {
  definition: BubbleConfig;
  color: string;
  interactive: boolean;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
};

function Bubble({ definition, color, interactive, springX, springY }: BubbleProps) {
  const {
    size,
    top,
    left,
    right,
    bottom,
    floatX,
    floatY,
    duration,
    delay = 0,
    blur = 0,
    opacity,
    parallax,
  } = definition;

  const translateX = useTransform(springX, (value) => value * parallax);
  const translateY = useTransform(springY, (value) => value * parallax);

  return (
    <motion.div
      className="absolute"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        filter: blur ? `blur(${blur}px)` : undefined,
      }}
      initial={{ x: 0, y: 0 }}
      animate={{
        x: [0, floatX, -floatX, 0],
        y: [0, -floatY, floatY, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <motion.div
        className="h-full w-full rounded-full mix-blend-screen"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(${color}, ${Math.min(opacity + 0.1, 1)}), rgba(${color}, ${opacity}))`,
          x: interactive ? translateX : undefined,
          y: interactive ? translateY : undefined,
        }}
      />
    </motion.div>
  );
}
