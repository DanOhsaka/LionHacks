"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-gradient-to-r from-emerald-400 to-cyan-300 text-zinc-900 hover:from-emerald-300 hover:to-cyan-200",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  outline: "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800/70",
  ghost: "bg-transparent text-zinc-200 hover:bg-zinc-800/60",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-11 rounded-lg px-8",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
          "disabled:pointer-events-none disabled:opacity-50",
          "focus-ring",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
