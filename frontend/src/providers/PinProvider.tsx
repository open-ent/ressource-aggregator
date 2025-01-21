import {
  FC,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSelectedStructureProvider } from "./SelectedStructureProvider";
import { PinProviderContextType, PinProviderProviderProps } from "./types";
import { useGetPinsQuery } from "../services/api/pin.service";
import { Favorite } from "~/model/Favorite.model";
import { Pin } from "~/model/Pin.model";
import { useGetFavoriteQuery } from "~/services/api/favorite.service";

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
  const { idSelectedStructure } = useSelectedStructureProvider();
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);

  const { data: favorite } = useGetFavoriteQuery(null);

  const { currentData: fetchedPins } = useGetPinsQuery(idSelectedStructure, {
    skip: !idSelectedStructure, // Skip the query if idSelectedStructure is null
  });

  useEffect(() => {
    if (favorite) {
      let favoriteData: Favorite[] =
        favorite?.data?.length > 0 ? favorite.data : [] ?? [];
      favoriteData = favoriteData.map((favorite: Favorite) => ({
        ...favorite,
        favorite: true,
      }));
      setFavorites(favoriteData);
    }
  }, [favorite]);

  useEffect(() => {
    if (fetchedPins) {
      let updatedPins = fetchedPins.map((pin: Pin) => ({
        ...pin,
        is_pinned: true,
      }));
      if (favorites) {
        updatedPins = updatedPins.map((pin: Pin) => ({
          ...pin,
          favorite: favorites.some(
            (favorite: Favorite) =>
              favorite?.id?.toString() === pin?.id?.toString() &&
              favorite?.source === pin?.source,
          ),
          favoriteId: favorites.find(
            (favorite: Favorite) =>
              favorite?.id?.toString() === pin?.id?.toString() &&
              favorite?.source === pin?.source,
          )?._id,
        }));
      }
      setPins(updatedPins);
    }
  }, [fetchedPins, favorites]);

  const value = useMemo<PinProviderContextType>(
    () => ({
      pins,
      setPins,
    }),
    [pins],
  );

  return (
    <PinProviderContext.Provider value={value}>
      {children}
    </PinProviderContext.Provider>
  );
};
