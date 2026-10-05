import { useEffect, useState } from "react";

// Return a value that only updates after the input has been stable for the delay.
export const useDebouncedValue = <T,>(value: T, delayMs = 400): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
