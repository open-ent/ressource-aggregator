import React from "react";

import { Checkbox, Grid, Modal } from "@edifice-ui/react";
import { Chip } from "@mui/material";
import { useTranslation } from "react-i18next";

import { breakpoints } from "~/core/const/breakpoints";
import { ModalEnum } from "~/core/enum/modal.enum";
import useWindowDimensions from "~/hooks/useWindowDimensions";
import { SearchResource } from "~/model/SearchResource.model";
import { Signet } from "~/model/Signet.model";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import "../Modal.scss";
import "./SignetPropertyView.scss";
import "../../chip-controller/ChipController.scss";
import "../create-signet/CreateSignet.scss";
import {
  convertDisciplines,
  convertKeyWords,
  convertLevels,
} from "~/utils/property.utils";

interface SignetPropertyViewProps {}

export const SignetPropertyView: React.FC<SignetPropertyViewProps> = () => {
  const { t } = useTranslation("mediacentre");
  const { modalResource, openModal, closeAllModals } = useModalProvider();
  const { resetResources } = useToasterProvider();
  const { width } = useWindowDimensions();

  const handleCloseModal = () => {
    resetResources();
    closeAllModals();
  };

  if (openModal !== ModalEnum.PROPERTY_VIEW_SIGNET || !modalResource) {
    return null;
  }

  return (
    <Modal
      onModalClose={handleCloseModal}
      isOpen={true}
      size="lg"
      viewport={false}
      id="create-signet"
    >
      <Modal.Header onModalClose={handleCloseModal}>
        {t("mediacentre.modal.signet.property.title")}
      </Modal.Header>
      <Modal.Body>
        <Grid>
          <Grid.Col
            lg={width < breakpoints.xl ? "2" : "3"}
            md="2"
            sm="4"
            style={{
              padding: ".8rem",
            }}
          >
            <img
              src={modalResource?.image}
              alt="Resource"
              onError={({ currentTarget }) => {
                currentTarget.onerror = null;
                currentTarget.src =
                  "/mediacentre/public/img/no-image-resource.png";
              }}
            />
          </Grid.Col>
          <Grid.Col
            lg={width < breakpoints.xl ? "6" : "9"}
            md="6"
            sm="4"
            style={{
              padding: ".8rem",
            }}
          >
            <div className="med-modal-signet-body">
              <div className="med-modal-property-box">
                <h5>{t("mediacentre.modal.signet.property.view.title")}</h5>
                <p>{modalResource?.title}</p>
              </div>
              <div className="med-modal-property-box">
                <h5>{t("mediacentre.modal.signet.property.view.url")}</h5>
                <p>
                  {(modalResource as SearchResource)?.link ??
                    (modalResource as SearchResource)?.url ??
                    ""}
                </p>
              </div>
              <div className="med-modal-property-box">
                <h5>{t("mediacentre.modal.signet.input.levels")}</h5>
                <div className="med-chip-controller">
                  {convertDisciplines(modalResource.disciplines).length > 0 ? (
                    convertLevels(modalResource.levels).map((level: string) => (
                      <Chip label={level} className="med-chip" />
                    ))
                  ) : (
                    <p>{t("mediacentre.modal.property.view.any.levels")}</p>
                  )}
                </div>
              </div>
              <div className="med-modal-property-box">
                <h5>{t("mediacentre.modal.signet.input.disciplines")}</h5>
                <div className="med-chip-controller">
                  {convertDisciplines(modalResource.disciplines).length > 0 ? (
                    convertDisciplines(modalResource.disciplines).map(
                      (level: string) => (
                        <Chip label={level} className="med-chip" />
                      ),
                    )
                  ) : (
                    <p>
                      {t("mediacentre.modal.property.view.any.disciplines")}
                    </p>
                  )}
                </div>
              </div>
              <div className="med-modal-property-box">
                <h5>{t("mediacentre.modal.signet.input.plaintext")}</h5>
                <div className="med-chip-controller">
                  {convertKeyWords(modalResource.plain_text).length > 0 ? (
                    convertKeyWords(modalResource.plain_text).map(
                      (keyword: string) => (
                        <Chip label={keyword} className="med-chip" />
                      ),
                    )
                  ) : (
                    <p>{t("mediacentre.modal.property.view.any.keyword")}</p>
                  )}
                </div>
              </div>
              <Checkbox
                checked={(modalResource as Signet)?.orientation ?? false}
                label={t("mediacentre.modal.signet.input.orientation")}
                disabled={true}
              />
            </div>
          </Grid.Col>
        </Grid>
      </Modal.Body>
    </Modal>
  );
};
