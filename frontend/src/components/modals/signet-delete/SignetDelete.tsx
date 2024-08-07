import React from "react";

import { Button, Modal } from "@edifice-ui/react";
import { useTranslation } from "react-i18next";

import { ModalEnum } from "~/core/enum/modal.enum";
import { PutSharePayload } from "~/model/payloads/PutSharePayload";
import { SearchResource } from "~/model/SearchResource.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import "../Modal.scss";
import {
  useDeleteSignetMutation,
  useUpdateShareResourceMutation,
} from "~/services/api/signet.service";

interface SignetDeleteProps {
  refetch: () => void;
}

export const SignetDelete: React.FC<SignetDeleteProps> = ({ refetch }) => {
  const { t } = useTranslation("mediacentre");
  const { openModal, closeAllModals } = useModalProvider();
  const { toasterResources, resetResources } = useToasterProvider();
  const [updateShareResource] = useUpdateShareResourceMutation();
  const [deleteSignet] = useDeleteSignetMutation();
  const { notify } = useAlertProvider();

  const handleCloseModal = () => {
    resetResources();
    closeAllModals();
  };

  const onSubmit = async () => {
    try {
      if (
        !toasterResources ||
        !toasterResources.find((resource) => resource.published)
      ) {
        notify(t("mediacentre.error.anyResource"), "danger");
        return;
      }
      const promises = toasterResources.map(
        async (resource: SearchResource) => {
          const idSignet = resource?.id?.toString();
          const sharePayload: PutSharePayload = {
            bookmarks: {},
            groups: {},
            users: {},
          };
          await updateShareResource({
            idSignet,
            payload: sharePayload,
          });
          const deleteResponse = await deleteSignet({ idSignet });
          if (deleteResponse?.error) {
            notify(t("mediacentre.error.delete"), "danger");
            return;
          }
        },
      );
      await Promise.all(promises);
      refetch();
      resetResources();
      handleCloseModal();
      notify(
        toasterResources.length > 1
          ? t("mediacentre.signet.delete.many.success")
          : t("mediacentre.signet.delete.success"),
        "success",
      );
    } catch (e) {
      console.error(e);
      notify(t("mediacentre.error.delete"), "danger");
    }
  };

  if (!toasterResources || openModal !== ModalEnum.DELETE_SIGNET) {
    return null;
  }

  return (
    <Modal onModalClose={handleCloseModal} isOpen={true} id="delete-signet">
      <Modal.Header onModalClose={handleCloseModal}>
        {t("mediacentre.modal.signet.delete.title")}
      </Modal.Header>
      <Modal.Body>
        {toasterResources.length > 1
          ? t("mediacentre.modal.signet.delete.subtitle.many")
          : t("mediacentre.modal.signet.delete.subtitle")}
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
