import React, {
  FC,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTranslation } from "react-i18next";

import { useAlertProvider } from "./AlertProvider";
import { useSelectedStructureProvider } from "./SelectedStructureProvider";
import { PinProviderContextType, PinProviderProviderProps } from "./types";
import { useGetPinsQuery } from "../services/api/pin.service";
import { Pin } from "~/model/Pin.model";

const PinProviderContext = createContext<PinProviderContextType | null>(null);

export const usePinProvider = () => {
  const context = useContext(PinProviderContext);
  if (!context) {
    throw new Error("usePinProvider must be used within a PinProviderProvider");
  }
  return context;
};

export const PinProvider: FC<PinProviderProviderProps> = ({ children }) => {
  const [pins, setPins] = useState<Pin[] | null>(null);
  const [isRefetchPins, setIsRefetchPins] = useState<boolean>(false);
  const { notify } = useAlertProvider();
  const { t } = useTranslation("mediacentre");
  const { idSelectedStructure } = useSelectedStructureProvider();

  const { currentData: fetchedPins, refetch: refetchPins } = useGetPinsQuery(
    idSelectedStructure!,
    {
      skip: !idSelectedStructure, // Skip the query if idSelectedStructure is null
    },
  );

  useEffect(() => {
    if (idSelectedStructure) {
      refetchPins();
    }
  }, [idSelectedStructure]);

  useEffect(() => {
    if (fetchedPins) {
      if (isRefetchPins) {
        notify(t("mediacentre.pin.success"), "success");
        setIsRefetchPins(false);
      }
      const updatedPins = fetchedPins.map((pin: Pin) => ({
        ...pin,
        is_pinned: true,
      }));
      setPins(updatedPins);
    }
  }, [fetchedPins]);

  const value = useMemo<PinProviderContextType>(
    () => ({
      pins,
      setPins,
      refetchPins,
      isRefetchPins,
      setIsRefetchPins,
    }),
    [pins, refetchPins],
  );

  return (
    <PinProviderContext.Provider value={value}>
      {children}
    </PinProviderContext.Provider>
  );
};
