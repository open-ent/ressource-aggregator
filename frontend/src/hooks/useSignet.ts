import { useCallback, useEffect, useState } from "react";

import { useUser } from "@edifice-ui/react";

import { Signet } from "./../model/Signet.model";
import {
  useGetPublishedSignetsQuery,
  useGetMySignetsQuery,
} from "./../services/api/signet.service";
import { useFavorite } from "./useFavorite";
import { SIGNET } from "~/core/const/sources.const";
import { Favorite } from "~/model/Favorite.model";
import { Pin } from "~/model/Pin.model";
import { usePinProvider } from "~/providers/PinProvider";
import {
  convertDisciplines,
  convertKeyWords,
  convertLevels,
} from "~/utils/property.utils";

export const useSignet = () => {
  const { user } = useUser();
  const { pins } = usePinProvider();
  const { data: publicSignets, refetch: refetchPublicSignet } =
    useGetPublishedSignetsQuery(null);
  const { data: mySignets, refetch: refetchMySignet } =
    useGetMySignetsQuery(null);
  const [homeSignets, setHomeSignets] = useState<Signet[] | null>(null);
  const [allSignets, setAllSignets] = useState<Signet[] | null>(null);
  const { favorites } = useFavorite();

  const getHomeSignets = useCallback(() => {
    if (!allSignets) {
      return null;
    }

    return allSignets.filter(
      (signet: Signet) => signet.owner_id != user?.userId,
    );
  }, [allSignets, user?.userId]);

  const getAllSignets = useCallback(() => {
    if (!publicSignets || !mySignets) {
      return null;
    }
    const publicSignetsData: Signet[] =
      publicSignets?.data?.signets?.resources ?? [];
    const updatedMySignetsData: Signet[] = mySignets.map((signet: Signet) => ({
      ...signet,
      source: SIGNET,
      shared: false,
      disciplines: convertDisciplines(signet.disciplines),
      levels: convertLevels(signet.levels),
      plain_text: convertKeyWords(signet.plain_text),
    }));
    const updatedPublicSignetsData: Signet[] = publicSignetsData.map(
      (signet: Signet) => ({
        ...signet,
        orientation: signet?.document_types?.some((type) =>
          type.toLowerCase().includes("orientation"),
        ),
        shared: true,
        source: SIGNET,
        published: true,
      }),
    );
    let signetsData: Signet[] = [
      ...updatedPublicSignetsData,
      ...updatedMySignetsData,
    ];
    if (favorites) {
      signetsData = signetsData.map((signet: Signet) => ({
        ...signet,
        favorite: favorites.some((fav: Favorite) =>
          signet?.id
            ? fav?.id?.toString() === signet?.id
            : fav?.id?.toString() === signet?._id,
        ),
      }));
    }
    if (pins) {
      signetsData = signetsData.map((signet: Signet) => ({
        ...signet,
        is_pinned: pins.some(
          (pin: Pin) =>
            pin?.id == signet?.id &&
            pin.source === "fr.openent.mediacentre.source.Signet",
        ),
      }));
    }
    return signetsData;
  }, [favorites, mySignets, publicSignets, pins]);

  const refetchSignet = async () => {
    await refetchPublicSignet();
    await refetchMySignet();
  };

  useEffect(() => {
    if (favorites && pins) {
      const signetsData = getHomeSignets();
      setHomeSignets(signetsData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSignets, favorites, pins]);

  useEffect(() => {
    if (favorites && pins) {
      const signetsData = getAllSignets();
      setAllSignets(signetsData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicSignets, mySignets, user?.userId, favorites, pins]);

  const mine = (signets: Signet[]) => {
    return signets.filter(
      (signet: Signet) => !signet.archived && signet.owner_id === user?.userId,
    );
  };

  const shared = (signets: Signet[]) => {
    return signets.filter(
      (signet: Signet) =>
        !signet.archived && signet.collab && signet.owner_id !== user?.userId,
    );
  };

  const published = (signets: Signet[]) => {
    return signets.filter(
      (signet: Signet) => !signet.archived && signet.shared,
    );
  };

  const archived = (signets: Signet[]) => {
    return signets.filter((signet: Signet) => signet.archived);
  };

  return {
    homeSignets,
    setHomeSignets,
    getHomeSignets,
    refetchSignet,
    allSignets,
    setAllSignets,
    mine,
    shared,
    published,
    archived,
  };
};
