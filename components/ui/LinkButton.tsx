import Link from "next/link";
import { ComponentProps } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./Button";

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Most of RefEval's navigation is a client-side screen switch (see
// app/page.tsx's `setScreen`), not routing — Button covers that. LinkButton
// exists for the handful of real Next.js routes RefEval does have (the
// /auth/* pages) and any future ones, for structural parity with RefOps.
export function LinkButton({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
