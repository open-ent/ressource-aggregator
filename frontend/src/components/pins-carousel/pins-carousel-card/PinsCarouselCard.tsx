import React, { useEffect, useState } from "react";

import { isActionAvailable } from "@edifice.io/client";
import { Card, Tooltip } from "@edifice.io/react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import InsertLinkRoundedIcon from "@mui/icons-material/InsertLinkRounded";
import PushPinIcon from "@mui/icons-material/PushPin";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useTranslation } from "react-i18next";

import { fields } from "~/core/const/fields";
import { GLOBAL, SIGNET } from "~/core/const/sources.const";
import { ModalEnum } from "~/core/enum/modal.enum";
import { Pin } from "~/model/Pin.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useSelectedStructureProvider } from "~/providers/SelectedStructureProvider";
import {
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "~/services/api/favorite.service";
import { useActions } from "~/services/queries";
import "./PinsCarouselCard.scss";

interface PinsCarouselCardProps {
  pin: Pin;
  link: string;
}

export const PinsCarouselCard: React.FC<PinsCarouselCardProps> = ({
  pin,
  link,
}) => {
  const [newLink, setNewLink] = useState<string>("");
  const { notify } = useAlertProvider();
  const { setModalResource, openSpecificModal } = useModalProvider();
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();
  // used to check if the user has the right to pin a resource
  const { data: actions } = useActions();
  const { idSelectedStructure } = useSelectedStructureProvider();
  const hasPinRight =
    isActionAvailable("pins", actions) &&
    idSelectedStructure === pin.structure_owner;
  const { t } = useTranslation("mediacentre");
  const [highlights, setHighlights] = useState<boolean | undefined>(false);
  const [textHighlight, setTextHighlight] = useState<string>("");

  const copy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(link);
    } else {
      console.error("Clipboard not available");
    }
    notify(t("mediacentre.notification.copy"), "success");
  };

  const edit = () => {
    setModalResource(pin);
    openSpecificModal(ModalEnum.EDIT_PIN);
  };

  useEffect(() => {
    if (
      !link.startsWith("https://") &&
      !link.startsWith("http://") &&
      link !== "/"
    ) {
      setNewLink("https://" + link);
    } else {
      setNewLink(link);
    }
  }, [link]);

  useEffect(() => {
    if (typeof window !== fields.UNDEFINED && window?.config) {
      setHighlights(window?.config?.highlightsPins || false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window?.config) {
      setTextHighlight(window?.config?.textHighlightsPins ?? "");
    }
  }, []);

  const addFavoriteResource = async () => {
    try {
      if (pin.source === SIGNET || pin.source === GLOBAL) {
        const newId = parseInt(pin.id as string);
        const newResource = {
          ...pin,
          id: newId,
        };
        await addFavorite({ id: newId, resource: newResource });
      } else {
        await addFavorite({ id: pin._id, resource: pin });
      }
      notify(t("mediacentre.notification.addFavorite"), "success");
      pin.favorite = true;
    } catch (e) {
      console.error(e);
    }
  };

  const removeFavoriteResource = async () => {
    try {
      if (pin.source === SIGNET || pin.source === GLOBAL) {
        const newId = pin.id ? parseInt(pin.id.toString()) : pin.id;
        await removeFavorite({
          id: newId,
          source: pin?.source,
        });
      } else {
        await removeFavorite({
          id: pin.favoriteId ?? pin._id,
          source: pin?.source,
        });
      }
      notify(t("mediacentre.notification.removeFavorite"), "success");
      pin.favorite = false;
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async () => {
    if (!pin?.action?.url) return;

    const response = await fetch(pin.action.url, { method: "POST" });

    if (!response?.ok) {
      return notify(t(pin.action.message.error), "danger");
    }

    notify(t(pin.action.message.success), "success");
  };

  const isMoodle = () => pin.source === "fr.openent.mediacentre.source.Moodle";

  return (
    <Card isClickable={false} isSelectable={false} className="med-pin-card">
      <a
        className="med-link-card-pin"
        href={newLink !== "/" ? newLink : "/"}
        target="_blank"
      >
        <Card.Title>{pin.pinned_title}</Card.Title>
        <Card.Body space={"0"}>
          <span className="med-pin-description">{pin.pinned_description}</span>
          <div className="med-pin-image-container">
            {pin.image ? (
              <img
                src={pin.image}
                alt={pin.pinned_title}
                className="med-pin-image"
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null;
                  currentTarget.src =
                    "/mediacentre/public/img/no-image-resource.png";
                }}
              />
            ) : (
              <img
                src="/mediacentre/public/img/no-image-resource.png"
                alt="Resource"
                className="med-pin-image"
              />
            )}
          </div>
        </Card.Body>
      </a>
      <Card.Footer>
        <div className="med-left-footer">
          {(highlights ?? false) && pin.is_parent && (
            <>
              <AutoAwesomeIcon />
              <span className="med-text-footer">{textHighlight}</span>
            </>
          )}
        </div>
        <div className="med-footer-svg">
          {hasPinRight && (
            <Tooltip message={t("mediacentre.card.edit.pin")} placement="top">
              <PushPinIcon className="med-pin" onClick={() => edit()} />
            </Tooltip>
          )}
          <Tooltip
            message={
              isMoodle()
                ? t("mediacentre.card.duplication")
                : t("mediacentre.card.copy")
            }
            placement="top"
          >
            {isMoodle() ? (
              <ContentCopyRoundedIcon
                className="med-link"
                onClick={handleDuplicate}
              />
            ) : (
              <InsertLinkRoundedIcon
                className="med-link"
                onClick={() => copy()}
              />
            )}
          </Tooltip>
          {pin.favorite ? (
            <Tooltip message={t("mediacentre.card.unfavorite")} placement="top">
              <StarIcon
                className="med-star"
                onClick={() => removeFavoriteResource()}
              />
            </Tooltip>
          ) : (
            <Tooltip message={t("mediacentre.card.favorite")} placement="top">
              <StarBorderIcon
                className="med-star"
                onClick={() => addFavoriteResource()}
              />
            </Tooltip>
          )}
        </div>
      </Card.Footer>
    </Card>
  );
};
