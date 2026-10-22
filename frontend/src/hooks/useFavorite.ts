import { useEffect, useState } from "react";

import { Favorite } from "./../model/Favorite.model";
import { useGetFavoriteQuery } from "./../services/api/favorite.service";
import { Pin } from "~/model/Pin.model";
import { usePinProvider } from "~/providers/PinProvider";

export const useFavorite = () => {
  const { pins } = usePinProvider();
  const { data: favorite, error, isLoading, refetch } = useGetFavoriteQuery(null);
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);

  useEffect(() => {
    if (favorite) {
      let favoriteData: Favorite[] =
        favorite?.data?.length > 0 ? favorite.data : [] ?? [];
      favoriteData = favoriteData.map((favorite: Favorite) => ({
        ...favorite,
        favorite: true,
      }));
      if (pins) {
        favoriteData = favoriteData.map((favorite: Favorite) => ({
          ...favorite,
          is_pinned: pins.some(
            (pin: Pin) =>
              pin?.id == favorite?.id && pin.source === favorite?.source,
          ),
        }));
      }
      setFavorites(favoriteData);
    } else if (error) {
      // Lecture refusée ou en échec (usager sans droit sur le médiacentre) : liste vide plutôt qu'un chargement sans fin,
      // que les signets, les épingles et les ressources globales attendent aussi.
      setFavorites([]);
    }
  }, [favorite, error, pins]);

  return { favorites, setFavorites, error, isLoading, refetch };
};
