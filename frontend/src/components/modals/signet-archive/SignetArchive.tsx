import React from "react";

import { Button, Modal } from "@edifice.io/react";
import { useTranslation } from "react-i18next";

import { ModalEnum } from "~/core/enum/modal.enum";
import { SearchResource } from "~/model/SearchResource.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import "../Modal.scss";
import { useUpdateSignetMutation } from "~/services/api/signet.service";
import {
  convertDisciplines,
  convertKeyWords,
  convertLevels,
} from "~/utils/property.utils";

interface SignetArchiveProps {
  refetch: () => void;
  disciplines: { id: string; label: string }[];
  levels: { id: string; label: string }[];
}

export const SignetArchive: React.FC<SignetArchiveProps> = ({
  refetch,
  levels,
  disciplines,
}) => {
  const { t } = useTranslation("mediacentre");
  const { openModal, closeAllModals } = useModalProvider();
  const { toasterResources, resetResources } = useToasterProvider();
  const [updateSignet] = useUpdateSignetMutation();
  const { notify } = useAlertProvider();

  const handleCloseModal = () => {
    resetResources();
    closeAllModals();
  };

  const onSubmit = async () => {
    try {
      if (!toasterResources) {
        notify(t("mediacentre.error.anyResource"), "danger");
        return;
      }
      const promises = toasterResources.map(
        async (resource: SearchResource) => {
          try {
            const idSignet = resource?.id?.toString();
            const payload = {
              ...resource,
              archived: true,
              levels: levels.filter((level) =>
                convertLevels(resource.levels).includes(level.label),
              ),
              disciplines: disciplines.filter((level) =>
                convertDisciplines(resource.disciplines).includes(level.label),
              ),
              plain_text: convertKeyWords(resource.plain_text).map(
                (keyword) => ({
                  label: keyword,
                }),
              ),
            };
            const response = await updateSignet({ idSignet, payload });
            if (response?.error) {
              throw new Error(t("mediacentre.error.archived"));
            }
            return { status: "fulfilled" };
          } catch (error) {
            return { status: "rejected", reason: error };
          }
        },
      );

      const results = await Promise.allSettled(promises);

      const rejectedResults = results.filter(
        (result) => (result as any)?.value?.status === "rejected",
      );

      if (rejectedResults.length > 0) {
        notify(t("mediacentre.error.archived"), "danger");
      } else {
        refetch();
        resetResources();
        handleCloseModal();
        notify(
          toasterResources.length > 1
            ? t("mediacentre.signet.archive.many.success")
            : t("mediacentre.signet.archive.success"),
          "success",
        );
      }
    } catch (e) {
      console.error(e);
      notify(t("mediacentre.error.archived"), "danger");
    }
  };

  if (!toasterResources || openModal !== ModalEnum.ARCHIVE_SIGNET) {
    return null;
  }

  return (
    <Modal onModalClose={handleCloseModal} isOpen={true} id="archive-signet">
      <Modal.Header onModalClose={handleCloseModal}>
        {toasterResources.length > 1
          ? t("mediacentre.modal.signet.archive.title.many")
          : t("mediacentre.modal.signet.archive.title")}
      </Modal.Header>
      <Modal.Body>
        {toasterResources.length > 1
          ? t("mediacentre.modal.signet.archive.subtitle.many")
          : t("mediacentre.modal.signet.archive.subtitle")}
      </Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" onClick={handleCloseModal}>
          {t("mediacentre.cancel")}
        </Button>
        <Button color="danger" type="submit" onClick={onSubmit}>
          {t("mediacentre.delete")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
