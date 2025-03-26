import { ReactNode } from "react";

export interface GlobalProviderContextProps {
  isPinHightlight: boolean;
  textPinHightlight: string;
}

export interface GlobalProviderProps {
  children: ReactNode;
  isPinHightlight: boolean;
  textPinHightlight: string;
}
