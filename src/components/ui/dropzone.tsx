"use client";

import { ImageIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import Dropzone from "react-dropzone";

import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

const ImagePreview = ({
  url,
  size = 300,
  onRemove,
}: {
  url: string;
  size?: number;
  onRemove: () => void;
}) => (
  <div className="relative aspect-square">
    <button className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2" onClick={onRemove}>
      <XCircleIcon className="h-5 w-5 fill-primary text-primary-foreground" />
    </button>
    <img
      alt=""
      className="h-full w-full rounded-md border border-border object-cover"
      height={size}
      src={url}
      width={size}
    />
  </div>
);

export default function InputDemo() {
  const [file, setFile] = useState<string | null>(null);

  return (
    <div className="w-full max-w-40">
      <Label htmlFor="profile">Profile Picture</Label>
      <div className="mt-2 w-full">
        {file ? (
          <ImagePreview onRemove={() => setFile(null)} url={file} />
        ) : (
          <Dropzone
            onDrop={(acceptedFiles) => {
              const file = acceptedFiles[0];
              if (file) {
                const fileUrl = URL.createObjectURL(file);
                setFile(fileUrl);
              }
            }}
          >
            {({ getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject }) => (
              <div
                {...getRootProps()}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border border-dashed focus:border-primary focus:outline-hidden",
                  {
                    "border-primary bg-secondary": isDragActive && isDragAccept,
                    "border-destructive bg-destructive/20": isDragActive && isDragReject,
                  },
                )}
              >
                <input {...getInputProps()} id="profile" />
                <ImageIcon className="h-16 w-16" strokeWidth={1.25} />
              </div>
            )}
          </Dropzone>
        )}
      </div>
    </div>
  );
}
