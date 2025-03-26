import { createContext, FC, useContext, useMemo } from "react";
import { GlobalProviderContextProps, GlobalProviderProps } from "./types";

const GlobalProviderContext = createContext<GlobalProviderContextProps | null>(
  null,
);

export const useGlobal = () => {
  const context = useContext(GlobalProviderContext);
  if (!context) {
    throw new Error("useGlobal must be used within a GlobalProvider");
  }
  return context;
};

export const GlobalProvider: FC<GlobalProviderProps> = ({
  children,
  isPinHightlight,
  textPinHightlight,
}) => {
  const value = useMemo<GlobalProviderContextProps>(
    () => ({
      isPinHightlight,
      textPinHightlight,
    }),
    [isPinHightlight, textPinHightlight],
  );

  return (
    <GlobalProviderContext.Provider value={value}>
      {children}
    </GlobalProviderContext.Provider>
  );
};
