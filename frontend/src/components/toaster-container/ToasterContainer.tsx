import { useCallback, useEffect, useState } from "react";

import { ActionBar, Button, checkUserRight } from "@edifice-ui/react";
import "./ToasterContainer.scss";
import { ShareOptions } from "node_modules/@edifice-ui/react/dist/common/ShareModal/ShareModal";
import { useTranslation } from "react-i18next";

import { ShareModalMediacentre } from "../modals/share-modal/ShareModalMediacentre";
import { ModalEnum } from "~/core/enum/modal.enum";
import { useSignet } from "~/hooks/useSignet";
import { SearchResource } from "~/model/SearchResource.model";
import { Signet } from "~/model/Signet.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import { useUpdateSignetMutation } from "~/services/api/signet.service";
import { useUserRightsStore } from "~/stores/rights/store";
import {
  convertDisciplines,
  convertKeyWords,
  convertLevels,
} from "~/utils/property.utils";

export interface ToasterContainerProps {
  selectedTab: string;
  refetch: () => void;
  disciplines: { id: string; label: string }[];
  levels: { id: string; label: string }[];
}

export const ToasterContainer: React.FC<ToasterContainerProps> = ({
  selectedTab,
  refetch,
  disciplines,
  levels,
}) => {
  const { t } = useTranslation("mediacentre");
  const { notify } = useAlertProvider();
  const { openModal, openSpecificModal, setModalResource } = useModalProvider();
  const {
    isToasterOpen,
    setIsToasterOpen,
    toasterResources,
    resetResources,
    toasterRights,
    setToasterRights,
  } = useToasterProvider();
  const [updateSignet] = useUpdateSignetMutation();
  const { getPublicSignets } = useSignet();
  const { setUserRights } = useUserRightsStore.getState();
  const [shareOptions, setShareOptions] = useState<ShareOptions | null>(null);

  const openProperty = () => {
    if (toasterResources && toasterResources.length === 1) {
      setModalResource(toasterResources[0]);
      openSpecificModal(ModalEnum.PROPERTY_SIGNET);
      setIsToasterOpen(false);
    } else {
      notify(t("mediacentre.toaster.selectOneResource.error"), "danger");
    }
  };

  const openPropertyView = () => {
    if (toasterResources && toasterResources.length === 1) {
      setModalResource(toasterResources[0]);
      openSpecificModal(ModalEnum.PROPERTY_VIEW_SIGNET);
      setIsToasterOpen(false);
    } else {
      notify(t("mediacentre.toaster.selectOneResource.error"), "danger");
    }
  };

  const openPublish = () => {
    if (toasterResources) {
      openSpecificModal(ModalEnum.PUBLISH_SIGNET);
      setIsToasterOpen(false);
    } else {
      notify(t("mediacentre.toaster.selectOneResource.error"), "danger");
    }
  };

  const openArchive = () => {
    if (toasterResources) {
      openSpecificModal(ModalEnum.ARCHIVE_SIGNET);
      setIsToasterOpen(false);
    } else {
      notify(t("mediacentre.toaster.selectOneResource.error"), "danger");
    }
  };

  const openDelete = () => {
    if (toasterResources) {
      openSpecificModal(ModalEnum.DELETE_SIGNET);
      setIsToasterOpen(false);
    } else {
      notify(t("mediacentre.toaster.selectOneResource.error"), "danger");
    }
  };

  const openDeletePublished = () => {
    if (toasterResources) {
      openSpecificModal(ModalEnum.DELETE_SIGNET_PUBLISHED);
      setIsToasterOpen(false);
    } else {
      notify(t("mediacentre.toaster.selectOneResource.error"), "danger");
    }
  };

  const openRestore = async () => {
    try {
      if (!toasterResources) {
        return null;
      }
      const promises = toasterResources?.map(
        async (resource: SearchResource) => {
          const idSignet = resource?.id?.toString();
          const payload = {
            ...resource,
            archived: false,
            levels: convertLevels(resource.levels)
              .filter((level) => levels.includes(level.label))
              .map((level) => ({ id: level.id, label: level.label })),
            disciplines: convertDisciplines(resource.disciplines)
              .filter((discipline) => disciplines.includes(discipline.label))
              .map((discipline) => ({
                id: discipline.id,
                label: discipline.label,
              })),
            plain_text: convertKeyWords(resource.plain_text).map((keyword) => ({
              label: keyword,
            })),
          };
          const response = await updateSignet({ idSignet, payload });
          if (response?.error) {
            notify(t("mediacentre.error.restore"), "danger");
            throw new Error(t("mediacentre.error.restore"));
          }
        },
      );
      await Promise.all(promises);
      refetch();
      resetResources();
      notify(
        toasterResources.length > 1
          ? t("mediacentre.signet.restore.many.success")
          : t("mediacentre.signet.restore.success"),
        "success",
      );
    } catch (e) {
      notify(t("mediacentre.error.restore"), "danger");
      console.error(e);
    }
  };

  const openSharedProperty = async () => {
    try {
      if (!toasterResources || toasterResources.length > 1) {
        return null;
      }
      const userRights = await checkUserRight(toasterResources[0].rights);
      if (userRights.manager) {
        openProperty();
      } else {
        openPropertyView();
      }
    } catch (error) {
      console.error("Error checking user rights:", error);
    }
  };

  const openShareModal = async () => {
    try {
      if (!toasterResources || toasterResources.length > 1) {
        return null;
      }

      const userRights = await checkUserRight(toasterResources[0].rights);

      setUserRights(userRights);

      setShareOptions({
        resourceCreatorId: toasterResources[0]?.owner_id?.toString() ?? "",
        resourceId: toasterResources[0]?.id?.toString() ?? "",
        resourceRights: (toasterResources[0].rights as string[]) ?? [],
      });
      setIsToasterOpen(false);
      resetResources();
      openSpecificModal(ModalEnum.SHARE_MODAL);
    } catch (error) {
      console.error("Error checking user rights:", error);
    }
  };

  const isSelectedUnpublished = () =>
    !toasterResources?.find(
      (resource: SearchResource) =>
        resource?.published ||
        getPublicSignets()?.find(
          (signet: Signet) => signet.id.toString() === resource?.id?.toString(),
        ),
    );

  const isManager = useCallback(() => toasterRights?.manager, [toasterRights]);

  useEffect(() => {
    const fetchUserRights = async () => {
      if (toasterResources && toasterResources.length === 1) {
        setToasterRights(await checkUserRight(toasterResources[0].rights));
      }
    };
    fetchUserRights();
  }, [toasterResources]);

  if (!toasterResources || toasterResources.length === 0 || !isToasterOpen) {
    return (
      <>
        {openModal === ModalEnum.SHARE_MODAL && shareOptions && (
          <ShareModalMediacentre
            shareOptions={shareOptions}
            onClose={() => setShareOptions(null)}
          />
        )}
      </>
    );
  }

  const sharedArray = [
    { action: openShareModal, label: "mediacentre.toaster.shared" },
    { action: openPublish, label: "mediacentre.toaster.published" },
    { action: openArchive, label: "mediacentre.toaster.archived" },
  ];

  return (
    <div className="med-toaster-container">
      <ActionBar>
        {selectedTab === "mediacentre.signets.mine" && (
          <>
            {toasterResources?.length === 1 && (
              <>
                <Button
                  type="button"
                  color="primary"
                  variant="filled"
                  onClick={openProperty}
                >
                  {t("mediacentre.toaster.properties")}
                </Button>
                <Button
                  type="button"
                  color="primary"
                  variant="filled"
                  onClick={openShareModal}
                >
                  {t("mediacentre.toaster.shared")}
                </Button>
                <Button
                  type="button"
                  color="primary"
                  variant="filled"
                  onClick={openPublish}
                >
                  {t("mediacentre.toaster.published")}
                </Button>
              </>
            )}
            <Button
              type="button"
              color="primary"
              variant="filled"
              onClick={openArchive}
            >
              {t("mediacentre.toaster.archived")}
            </Button>
          </>
        )}
        {selectedTab === "mediacentre.signets.shared" && (
          <>
            <Button
              type="button"
              color="primary"
              variant="filled"
              onClick={openSharedProperty}
            >
              {t("mediacentre.toaster.properties")}
            </Button>
            {isManager() &&
              sharedArray.map((item) => (
                <Button
                  type="button"
                  color="primary"
                  variant="filled"
                  onClick={item.action}
                >
                  {t(item.label)}
                </Button>
              ))}
          </>
        )}
        {selectedTab === "mediacentre.signets.published" && (
          <>
            <Button
              type="button"
              color="primary"
              variant="filled"
              onClick={openDeletePublished}
            >
              {t("mediacentre.toaster.delete")}
            </Button>
          </>
        )}
        {selectedTab === "mediacentre.signets.archived" && (
          <>
            <Button
              type="button"
              color="primary"
              variant="filled"
              onClick={openRestore}
            >
              {t("mediacentre.toaster.restore")}
            </Button>
            {isSelectedUnpublished() && (
              <Button
                type="button"
                color="primary"
                variant="filled"
                onClick={openDelete}
              >
                {t("mediacentre.toaster.delete")}
              </Button>
            )}
          </>
        )}
      </ActionBar>
      {openModal === ModalEnum.SHARE_MODAL && shareOptions && (
        <ShareModalMediacentre
          shareOptions={shareOptions}
          onClose={() => setShareOptions(null)}
        />
      )}
    </div>
  );
};
