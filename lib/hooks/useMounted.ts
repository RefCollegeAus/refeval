import { useEffect, useState } from "react";

// Guards portal-rendering components (Modal, Toast) against a
// server/client markup mismatch — document.body isn't available during SSR.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
