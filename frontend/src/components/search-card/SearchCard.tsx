import "./SearchCard.scss";
import React, { useEffect, useState } from "react";

import { Card, isActionAvailable, Tooltip } from "@edifice-ui/react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import PinIcon from "@mui/icons-material/PushPin";
import UnPinIcon from "@mui/icons-material/PushPinOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import anime from "animejs";
import { useTranslation } from "react-i18next";

import { SearchCardDescription } from "./search-card-description/SearchCardDescription";
import { SearchCardDetails } from "./search-card-details/SearchCardDetails";
import { SearchCardSubtitle } from "./search-card-subtitle/SearchCardSubtitle";
import { SearchCardType } from "./search-card-type/SearchCardType";
import { GLOBAL, SIGNET } from "~/core/const/sources.const";
import { ModalEnum } from "~/core/enum/modal.enum";
import { SearchCardTypeEnum } from "~/core/enum/search-card-type.enum";
import { Resource } from "~/model/Resource.model";
import { SearchResource } from "~/model/SearchResource.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import {
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "~/services/api/favorite.service";
import { useActions } from "~/services/queries";

interface SearchResourceProps {
  publishedIsChecked?: boolean;
  searchResource: SearchResource;
  link: string;
  setIsRemoveResource: (value: boolean) => void;
  allResourcesDisplayed?: Resource[] | null;
}

export const SearchCard: React.FC<SearchResourceProps> = ({
  publishedIsChecked = false,
  searchResource,
  link,
  setIsRemoveResource,
  allResourcesDisplayed,
}) => {
  const [newLink, setNewLink] = useState<string>("");
  const { t } = useTranslation("mediacentre");
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();
  const { setModalResource, openSpecificModal } = useModalProvider();
  const { notify } = useAlertProvider();
  const { isSelectable, toggleResource, selectedTab } = useToasterProvider();

  // used to check if the user has the right to pin a resource
  const { data: actions } = useActions();
  const hasPinRight = isActionAvailable("pins", actions);
  const canAccessSignet = isActionAvailable("signets", actions);

  const type = (): SearchCardTypeEnum => {
    if (searchResource?.source) {
      switch (searchResource.source) {
        case "fr.openent.mediacentre.source.Moodle":
          return SearchCardTypeEnum.moodle;
        case "fr.openent.mediacentre.source.Signet":
          return SearchCardTypeEnum.book_mark;
        case "fr.openent.mediacentre.source.GAR":
          if (searchResource?.is_textbook) {
            return SearchCardTypeEnum.manuals;
          }
          return SearchCardTypeEnum.external_resources;
        case "fr.openent.mediacentre.source.GlobalResource":
          return SearchCardTypeEnum.external_resources;
        default:
          return SearchCardTypeEnum.manuals;
      }
    } else {
      return SearchCardTypeEnum.manuals;
    }
  };

  const copy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(
        searchResource?.link ?? searchResource?.url ?? "",
      );
      notify(t("mediacentre.notification.copy"), "success");
    } else {
      console.error("Clipboard not available");
    }
  };

  const fav = async () => {
    try {
      if (searchResource.source === SIGNET) {
        const newId = searchResource.id
          ? parseInt(searchResource.id.toString())
          : searchResource.id;
        const newSearchResource = {
          ...searchResource,
          id: newId,
        };
        await addFavorite({
          id: newId,
          resource: newSearchResource,
        });
      } else {
        const newSearchResource = {
          ...searchResource,
          _id: undefined,
        };
        await addFavorite({
          id: searchResource._id,
          resource: newSearchResource,
        });
      }
      notify(t("mediacentre.notification.addFavorite"), "success");
      searchResource.favorite = true;
    } catch (e) {
      console.error(e);
    }
  };

  const unfav = async () => {
    try {
      if (
        searchResource.source === SIGNET ||
        searchResource.source === GLOBAL
      ) {
        const newId = searchResource.id
          ? parseInt(searchResource.id.toString())
          : searchResource.id;
        await removeFavorite({
          id: newId,
          source: searchResource?.source,
        });
      } else {
        await removeFavorite({
          id: searchResource.favoriteId ?? searchResource._id,
          source: searchResource?.source,
        });
      }
      notify(t("mediacentre.notification.removeFavorite"), "success");
      searchResource.favorite = false;
      setIsRemoveResource(true);
    } catch (e) {
      console.error(e);
    }
  };

  const pin = () => {
    if (searchResource) {
      setModalResource(searchResource);
      openSpecificModal(ModalEnum.CREATE_PIN);
    }
  };

  const toggleExpand = () => {
    const cardElement = cardRef.current;

    if (cardElement) {
      const targetHeight = isExpanded
        ? "177px"
        : cardElement.scrollHeight + "px";
      anime({
        targets: cardElement,
        height: targetHeight,
        duration: 700,
        easing: "easeInOutQuad",
        complete: () => {
          cardElement.style.height = targetHeight;
        },
      });

      setIsExpanded(!isExpanded);
    }
  };

  useEffect(() => {
    const cardElement = cardRef.current;
    if (cardElement) {
      cardElement.style.height = "177px";
    }
    setIsExpanded(false);
  }, [allResourcesDisplayed]);

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

  return (
    <Card
      isSelectable={
        canAccessSignet &&
        (selectedTab !== "mediacentre.signets.published" || publishedIsChecked)
      }
      isSelected={isSelectable(searchResource)}
      isClickable={false}
      className={`med-search-resource-card ${
        isExpanded ? "expanded" : "not-expanded"
      }`}
      onSelect={() => toggleResource(searchResource)}
      ref={cardRef}
    >
      <div className="med-search-resource-top-container">
        <a href={newLink !== "/" ? newLink : "/"} target="_blank">
          <div className="med-search-resource-left-container">
            {searchResource.image && (
              <img
                src={searchResource.image}
                alt="Resource"
                className="med-search-resource-image"
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null;
                  currentTarget.src =
                    "/mediacentre/public/img/no-image-resource.png";
                }}
              />
            )}
          </div>
        </a>
        <div className="med-search-resource-right-container">
          <a href={newLink !== "/" ? newLink : "/"} target="_blank">
            <Card.Body space={"0"}>
              <SearchCardType type={type()} />
              <Card.Title>{searchResource.title}</Card.Title>
              <SearchCardSubtitle
                type={type()}
                searchResource={searchResource}
              />
            </Card.Body>
          </a>
          <Card.Footer>
            <div
              className="med-footer-details"
              role="button"
              onClick={toggleExpand}
              onKeyDown={() => {}}
              tabIndex={0}
            >
              <InfoOutlinedIcon className="med-footer-icon med-info-icon" />
              {t("mediacentre.description.button")}
              {isExpanded ? (
                <KeyboardArrowDownIcon className="med-footer-icon" />
              ) : (
                <KeyboardArrowRight className="med-footer-icon" />
              )}
            </div>
            <div className="med-footer-svg">
              {hasPinRight &&
                (searchResource?.is_pinned ? (
                  <Tooltip
                    message={t("mediacentre.card.already.pinned")}
                    placement="top"
                  >
                    <PinIcon className="med-pin" />
                  </Tooltip>
                ) : (
                  <Tooltip message={t("mediacentre.card.pin")} placement="top">
                    <UnPinIcon className="med-pin" onClick={() => pin()} />
                  </Tooltip>
                ))}
              <Tooltip message={t("mediacentre.card.copy")} placement="top">
                <ContentCopyIcon className="med-link" onClick={() => copy()} />
              </Tooltip>
              {searchResource.favorite ? (
                <Tooltip
                  message={t("mediacentre.card.unfavorite")}
                  placement="top"
                >
                  <StarIcon className="med-star" onClick={() => unfav()} />
                </Tooltip>
              ) : (
                <Tooltip
                  message={t("mediacentre.card.favorite")}
                  placement="top"
                >
                  <StarBorderIcon className="med-star" onClick={() => fav()} />
                </Tooltip>
              )}
            </div>
          </Card.Footer>
        </div>
      </div>
      <div className={`med-search-resource-bottom-container`}>
        {searchResource.description && (
          <SearchCardDescription searchResource={searchResource} />
        )}
        <SearchCardDetails searchResource={searchResource} />
      </div>
    </Card>
  );
};
