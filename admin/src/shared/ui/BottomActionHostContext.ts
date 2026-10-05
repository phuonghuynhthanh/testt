import { createContext } from "react";

// Share the layout-owned action host without viewport measurements or sidebar offsets.
export const BottomActionHostContext = createContext<HTMLDivElement | null>(null);
