import React from "react";

import { Button, Modal } from "@edifice-ui/react";
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
          const payload = {
            ...resource,
            archived: true,
            levels: convertLevels(resource.levels).reduce((acc, level) => {
              if (levels.includes(level.label)) {
                acc.push({ id: level.id, label: level.label });
              }
              return acc;
            }),
            disciplines: convertDisciplines(resource.disciplines).reduce(
              (acc, discipline) => {
                if (disciplines.includes(discipline.label)) {
                  acc.push({ id: discipline.id, label: discipline.label });
                }
                return acc;
              },
            ),
            plain_text: convertKeyWords(resource.plain_text).map((keyword) => ({
              label: keyword,
            })),
          };
          const idSignet = resource?.id?.toString();
          const response = await updateSignet({ idSignet, payload });
          if (response?.error) {
            notify(t("mediacentre.error.archived"), "danger");
            throw new Error(t("mediacentre.error.archived"));
          }
        },
      );
      await Promise.all(promises);
      refetch();
      resetResources();
      handleCloseModal();
      notify(
        toasterResources.length > 1
          ? t("mediacentre.signet.archive.many.success")
          : t("mediacentre.signet.archive.success"),
        "success",
      );
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
        {t("mediacentre.modal.signet.archive.title")}
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
