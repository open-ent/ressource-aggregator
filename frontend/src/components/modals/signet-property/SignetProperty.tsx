import React, { useEffect, useState } from "react";

import {
  AlertTypes,
  Button,
  Checkbox,
  FormControl,
  Grid,
  Input,
  Label,
  Modal,
} from "@edifice-ui/react";
import { useTranslation } from "react-i18next";

import { ChipController } from "~/components/chip-controller/ChipController";
import { DropDown } from "~/components/drop-down/DropDown";
import UniqueImagePicker from "~/components/unique-image-picker/UniqueImagePicker";
import { breakpoints } from "~/core/const/breakpoints";
import { ModalEnum } from "~/core/enum/modal.enum";
import useImageHandler from "~/hooks/useImageHandler";
import useWindowDimensions from "~/hooks/useWindowDimensions";
import { SearchResource } from "~/model/SearchResource.model";
import { Signet } from "~/model/Signet.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import { useUpdateSignetMutation } from "~/services/api/signet.service";
import "../Modal.scss";
import "../create-signet/CreateSignet.scss";
import {
  convertDisciplines,
  convertKeyWords,
  convertLevels,
} from "~/utils/property.utils";

interface SignetPropertyProps {
  refetch: () => void;
  disciplines: { id: string; label: string }[];
  levels: { id: string; label: string }[];
}

export const SignetProperty: React.FC<SignetPropertyProps> = ({
  refetch,
  levels,
  disciplines,
}) => {
  const { t } = useTranslation("mediacentre");
  const { modalResource, openModal, closeAllModals } = useModalProvider();
  const { resetResources } = useToasterProvider();
  const { setAlertText, setAlertType } = useAlertProvider();
  const [updateSignet] = useUpdateSignetMutation();
  const [allLevels, setAllLevels] = useState<string[] | null>(null);
  const [allDisciplines, setAllDisciplines] = useState<string[] | null>(null);
  const [title, setTitle] = useState<string>(modalResource?.title ?? "");
  const [url, setURL] = useState<string>(
    (modalResource as SearchResource)?.link ??
      (modalResource as SearchResource)?.url ??
      "",
  );
  const { width } = useWindowDimensions();
  const [thumbnailSrc, setThumbnailSrc] = useState(modalResource?.image ?? "");
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({
    levels: convertLevels(modalResource?.levels ?? []),
    disciplines: convertDisciplines(modalResource?.disciplines ?? []),
  });
  const [plainText, setPlainText] = useState<string>("");
  const [keyWordArray, setKeyWordArray] = useState<string[]>(
    convertKeyWords(modalResource?.plain_text ?? []),
  );
  const [isOrientationChecked, setIsOrientationChecked] = useState<boolean>(
    (modalResource as Signet)?.orientation ?? false,
  );

  const setSelectedCheckboxesItems = (key: string) => {
    return (value: string[]) =>
      setSelectedCheckboxes({ ...selectedCheckboxes, [key]: value });
  };

  const {
    cover: thumbnail,
    handleUploadImage: handleUploadImageThumbnail,
    handleDeleteImage: handleDeleteImageThumbnail,
    fetchUrl: fetchThumbnailUrl,
  } = useImageHandler("");

  const handleCloseModal = () => {
    resetResources();
    closeAllModals();
  };

  const resetFields = () => {
    setTitle("");
    setURL("");
    setPlainText("");
    setSelectedCheckboxes({
      levels: [],
      disciplines: [],
    });
    setIsOrientationChecked(false);
  };

  const notify = (message: string, type: AlertTypes) => {
    setAlertText(message);
    setAlertType(type);
  };

  const onSubmit = async () => {
    try {
      let imageUrl: string | null = null;
      if (thumbnailSrc != "" && thumbnail == "") {
        imageUrl = thumbnailSrc;
      } else if (thumbnail != "") {
        await fetchThumbnailUrl().then((url) => {
          imageUrl = url;
        });
      } else {
        notify(t("mediacentre.modal.signet.ask.image"), "danger");
        return;
      }
      const payload: any = {
        ...modalResource,
        levels:
          levels
            ?.filter((level: { label: string }) =>
              selectedCheckboxes.levels.includes(level.label),
            )
            ?.map((level: { id: string; label: string }) => ({
              id: level.id,
              label: level.label,
            })) ?? [],
        disciplines:
          disciplines
            ?.filter((discipline: { label: string }) =>
              selectedCheckboxes.disciplines.includes(discipline.label),
            )
            ?.map((discipline: { id: string; label: string }) => ({
              id: discipline.id,
              label: discipline.label,
            })) ?? [],
        plain_text:
          keyWordArray?.map((keyword: string) => ({ label: keyword })) ?? [],
        title: title,
        url: url,
        image: imageUrl ?? "",
        orientation: isOrientationChecked,
      };
      const idSignet = modalResource?.id?.toString();
      const response = await updateSignet({ idSignet, payload });
      if (response?.error) {
        notify(t("mediacentre.error.signet.update"), "danger");
        return;
      }
      refetch();
      resetResources();
      handleCloseModal();
      resetFields();
      notify(t("mediacentre.signet.update.success"), "success");
    } catch (error) {
      notify(t("mediacentre.error.signet.update"), "danger");
      console.error(error);
    }
  };

  const handleChangePlainText = (value: string) => {
    if (value.trim() !== "") {
      setPlainText(value);
    }
  };

  const handleKeyPress = (e: any) => {
    if ((e.key === "Enter" || e.key === " ") && plainText !== "") {
      setKeyWordArray([...keyWordArray, plainText.trim()]);
      setPlainText("");
    }
  };

  const handleDelete = (index: number, key: "levels" | "disciplines") => {
    const newArray = selectedCheckboxes[key].filter((_, i) => i !== index);
    setSelectedCheckboxesItems(key)(newArray);
  };

  const canUpdateSignet = () => {
    return (
      title &&
      url &&
      !!selectedCheckboxes?.levels?.length &&
      !!selectedCheckboxes?.disciplines?.length &&
      (thumbnail != "" || thumbnailSrc != "")
    );
  };

  useEffect(() => {
    if (levels) {
      setAllLevels(
        levels?.map((level: { id: string; label: string }) => level.label) ??
          [],
      );
    }
    if (disciplines) {
      setAllDisciplines(
        disciplines?.map(
          (discipline: { id: string; label: string }) => discipline.label,
        ) ?? [],
      );
    }
  }, [levels, disciplines]);

  if (
    !allLevels ||
    !allDisciplines ||
    openModal !== ModalEnum.PROPERTY_SIGNET ||
    !modalResource
  ) {
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
      <Modal.Subtitle>
        {t("mediacentre.modal.signet.property.subtitle")}
      </Modal.Subtitle>
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
            <UniqueImagePicker
              addButtonLabel="Add image"
              deleteButtonLabel="Delete image"
              label="Upload an image"
              onUploadImage={handleUploadImageThumbnail}
              onDeleteImage={handleDeleteImageThumbnail}
              src={thumbnailSrc}
              onImageChange={(file: any) => {
                if (file) {
                  handleUploadImageThumbnail(file);
                } else {
                  handleDeleteImageThumbnail();
                  setThumbnailSrc("");
                }
              }}
            />
            {(thumbnail == "" || thumbnail == null) && thumbnailSrc == "" && (
              <div className="font-red">
                {t("mediacentre.modal.signet.ask.image")} *
              </div>
            )}
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
              <FormControl id="create-signet-title" isRequired={true}>
                <Label>{t("mediacentre.modal.signet.input.title")}</Label>
                <Input
                  value={title}
                  placeholder={t("mediacentre.modal.signet.input.title")}
                  size="md"
                  type="text"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormControl>
              <FormControl id="create-signet-url" isRequired={true}>
                <Label>{t("mediacentre.modal.signet.input.url")}</Label>
                <Input
                  value={url}
                  placeholder={t("mediacentre.modal.signet.input.url")}
                  size="md"
                  type="text"
                  onChange={(e) => setURL(e.target.value)}
                />
              </FormControl>
              <FormControl id="create-signet-level" isRequired={true}>
                <Label>{t("mediacentre.modal.signet.input.levels")}</Label>
                <DropDown
                  selectedCheckboxes={selectedCheckboxes.levels}
                  setSelectedCheckboxes={setSelectedCheckboxesItems("levels")}
                  checkboxOptions={allLevels ?? []}
                  label={t(
                    `mediacentre.filter.${
                      allLevels.length > 1 ? "levels" : "level"
                    }`,
                  )}
                  selectAll={true}
                />
                <ChipController
                  array={selectedCheckboxes?.levels}
                  onDelete={(index: number) => handleDelete(index, "levels")}
                  className="med-chip-dropdown"
                />
              </FormControl>
              <FormControl id="create-signet-discipline" isRequired={true}>
                <Label>{t("mediacentre.modal.signet.input.disciplines")}</Label>
                <DropDown
                  selectedCheckboxes={selectedCheckboxes.disciplines}
                  setSelectedCheckboxes={setSelectedCheckboxesItems(
                    "disciplines",
                  )}
                  checkboxOptions={allDisciplines ?? []}
                  label={t(
                    `mediacentre.filter.${
                      allDisciplines.length > 1 ? "disciplines" : "discipline"
                    }`,
                  )}
                  selectAll={true}
                />
                <ChipController
                  array={selectedCheckboxes?.disciplines}
                  onDelete={(index: number) =>
                    handleDelete(index, "disciplines")
                  }
                  className="med-chip-dropdown"
                />
              </FormControl>
              <FormControl id="create-signet-plaintext">
                <Label>{t("mediacentre.modal.signet.input.plaintext")}</Label>
                <Input
                  value={plainText}
                  placeholder={t("mediacentre.modal.signet.input.plaintext")}
                  size="md"
                  type="text"
                  onChange={(e) => handleChangePlainText(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </FormControl>
              <ChipController
                array={keyWordArray}
                onDelete={(index: number) =>
                  setKeyWordArray(keyWordArray.filter((_, i) => i !== index))
                }
              />
              <FormControl id="create-signet-orientation">
                <Checkbox
                  checked={isOrientationChecked}
                  label={t("mediacentre.modal.signet.input.orientation")}
                  onChange={() =>
                    setIsOrientationChecked(
                      (isOrientationChecked) => !isOrientationChecked,
                    )
                  }
                />
              </FormControl>
            </div>
          </Grid.Col>
        </Grid>
      </Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" onClick={handleCloseModal}>
          {t("mediacentre.cancel")}
        </Button>
        <Button
          color="primary"
          type="submit"
          disabled={!canUpdateSignet()}
          onClick={onSubmit}
        >
          {t("mediacentre.modal.signet.button.update")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
