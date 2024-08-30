import React from "react";

import { Button, Modal } from "@edifice-ui/react";
import { useTranslation } from "react-i18next";

import { ModalEnum } from "~/core/enum/modal.enum";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import "../Modal.scss";
import { usePublishSignetMutation } from "~/services/api/signet.service";
import {
  convertDisciplines,
  convertKeyWords,
  convertLevels,
} from "~/utils/property.utils";

interface SignetPublishProps {
  refetch: () => void;
  disciplines: { id: string; label: string }[];
  levels: { id: string; label: string }[];
}

export const SignetPublish: React.FC<SignetPublishProps> = ({
  refetch,
  disciplines,
  levels,
}) => {
  const { t } = useTranslation("mediacentre");
  const { openModal, closeAllModals } = useModalProvider();
  const { toasterResources, resetResources } = useToasterProvider();
  const [publishSignet] = usePublishSignetMutation();
  const { notify } = useAlertProvider();

  const handleCloseModal = () => {
    resetResources();
    closeAllModals();
  };

  const onSubmit = async () => {
    try {
      if (!toasterResources || toasterResources.length > 1) {
        notify(t("mediacentre.error.anyResource"), "success");
        return;
      }
      const payload = {
        ...toasterResources[0],
        levels: levels.filter((level) =>
          convertLevels(toasterResources[0].levels).includes(level.label),
        ),
        disciplines: disciplines.filter((level) =>
          convertDisciplines(toasterResources[0].disciplines).includes(
            level.label,
          ),
        ),
        plain_text: convertKeyWords(toasterResources[0].plain_text).map(
          (keyword) => ({ label: keyword }),
        ),
      };
      const idSignet = toasterResources[0]?.id?.toString();
      const response = await publishSignet({ idSignet, payload });
      if (response?.error) {
        notify(t("mediacentre.error.publish"), "danger");
        return;
      }
      await refetch();
      resetResources();
      handleCloseModal();
      notify(t("mediacentre.signet.publish.success"), "success");
    } catch (e) {
      console.error(e);
      notify(t("mediacentre.error.publish"), "danger");
    }
  };

  if (
    !toasterResources ||
    toasterResources.length > 1 ||
    openModal !== ModalEnum.PUBLISH_SIGNET
  ) {
    return null;
  }

  return (
    <Modal onModalClose={handleCloseModal} isOpen={true} id="publish-signet">
      <Modal.Header onModalClose={handleCloseModal}>
        {t("mediacentre.modal.signet.publish.title")}
      </Modal.Header>
      <Modal.Body>{t("mediacentre.modal.signet.publish.subtitle")}</Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" onClick={handleCloseModal}>
          {t("mediacentre.cancel")}
        </Button>
        <Button color="primary" type="submit" onClick={onSubmit}>
          {t("mediacentre.publish")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
