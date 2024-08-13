import { useState } from "react";

import { ActionBar, Button, checkUserRight } from "@edifice-ui/react";
import "./ToasterContainer.scss";
import { ShareOptions } from "node_modules/@edifice-ui/react/dist/common/ShareModal/ShareModal";
import { useTranslation } from "react-i18next";

import { ShareModalMediacentre } from "../modals/share-modal/ShareModalMediacentre";
import { ModalEnum } from "~/core/enum/modal.enum";
import { SearchResource } from "~/model/SearchResource.model";
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
  const { isToasterOpen, setIsToasterOpen, toasterResources, resetResources } =
    useToasterProvider();
  const [updateSignet] = useUpdateSignetMutation();
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
      openSpecificModal(ModalEnum.SHARE_MODAL);
    } catch (error) {
      console.error("Error checking user rights:", error);
    }
  };

  const isSelectedUnpublished = () =>
    !toasterResources?.find((resource: SearchResource) => resource?.published);

  if (!toasterResources || toasterResources.length === 0 || !isToasterOpen) {
    return null;
  }

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
              onClick={openPropertyView}
            >
              {t("mediacentre.toaster.properties")}
            </Button>
          </>
        )}
        {selectedTab === "mediacentre.signets.published" && (
          <>
            <Button
              type="button"
              color="primary"
              variant="filled"
              onClick={openDelete}
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
