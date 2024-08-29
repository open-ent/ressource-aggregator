import { Dropdown } from "@edifice-ui/react";
import "./DropDown.scss";
import { useTranslation } from "react-i18next";

interface DropDownProps {
  checkboxOptions: string[];
  selectedCheckboxes: string[];
  setSelectedCheckboxes: (value: string[]) => void;
  label: string;
  selectAll?: boolean;
}
export const DropDown: React.FC<DropDownProps> = ({
  checkboxOptions,
  selectedCheckboxes,
  setSelectedCheckboxes,
  label,
  selectAll = false,
}) => {
  const { t } = useTranslation("mediacentre");

  const handleMultiCheckbox = (
    selectedCheckboxes: string[],
    setSelectedCheckboxes: (value: string[]) => void,
    value: string,
  ) => {
    let checked = [...selectedCheckboxes];
    const findIndex = checked.findIndex(
      (item: string): boolean => item === value,
    );

    if (!selectedCheckboxes.includes(value)) {
      checked = [...selectedCheckboxes, value];
    } else {
      checked = selectedCheckboxes.filter(
        (_, index: number) => index !== findIndex,
      );
    }
    setSelectedCheckboxes(checked);
  };

  const toggleSelectAll = () => {
    if (!selectedCheckboxes || !selectedCheckboxes.length) {
      setSelectedCheckboxes(checkboxOptions);
    } else {
      setSelectedCheckboxes([]);
    }
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        label={label}
        badgeContent={selectedCheckboxes.length || 0}
      />
      <Dropdown.Menu>
        <div
          className={
            !selectedCheckboxes.length && !selectAll
              ? "dropdown-item-disabled"
              : ""
          }
        >
          {selectAll ? (
            <Dropdown.Item
              key={`select-all-${label}`}
              onClick={() => toggleSelectAll()}
            >
              {selectedCheckboxes === undefined ||
              selectedCheckboxes.length === 0
                ? t("mediacentre.combo.selectAll")
                : t("mediacentre.combo.deselectAll")}
            </Dropdown.Item>
          ) : (
            <Dropdown.Item
              key={`reset-filter-${label}`}
              onClick={() => setSelectedCheckboxes([])}
            >
              {t("mediacentre.filter.reset")}
            </Dropdown.Item>
          )}
        </div>
        <Dropdown.Separator />
        {checkboxOptions.map((option, index) => (
          <Dropdown.CheckboxItem
            key={index}
            value={option}
            model={selectedCheckboxes}
            onChange={() =>
              handleMultiCheckbox(
                selectedCheckboxes,
                setSelectedCheckboxes,
                option,
              )
            }
          >
            {option}
          </Dropdown.CheckboxItem>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};
