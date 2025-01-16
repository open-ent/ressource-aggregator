import React, { useRef, FC } from "react";

import { ImagePicker } from "@cgi-learning-hub/ui";

interface UniqueImagePickerProps {
  onUploadImage: (file: File) => void;
  onDeleteImage: () => void;
  src?: string;
  onImageChange: (file: File | null) => void;
}

const UniqueImagePicker: FC<UniqueImagePickerProps> = ({
  onUploadImage,
  onDeleteImage,
  src,
  onImageChange,
  ...props
}) => {
  const idRef = useRef(
    `image-picker-${Math.random().toString(36).substring(2, 11)}`,
  );

  const handleFileChange = (file: File | null) => {
    if (file) {
      onUploadImage(file);
    } else {
      onDeleteImage();
    }
    onImageChange(file);
  };

  return (
    <div id={idRef.current}>
      <ImagePicker
        {...props}
        initialFile={src}
        onFileChange={handleFileChange}
      />
    </div>
  );
};

export default UniqueImagePicker;
