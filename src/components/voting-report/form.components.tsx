import { useStore } from "@tanstack/react-form";
import {
  File as FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  LucideIcon,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import ReactDropzone from "react-dropzone";

import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";
import {
  Combobox as ComboboxUI,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input as InputUI } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { RadioGroup as RadioGroupUI, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useFieldContext, useFormContext } from "@/hooks/form-context";
import { cn } from "@/utils/cn";
import { Asset, Office, OFFICES } from "@/utils/form.schema";

import {
  Select as SelectUI,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function SubscribeButton({ label }: { label: string }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full sm:w-auto px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 ${isSubmitting ? "cursor-not-allowed opacity-50 bg-slate-300 shadow-none text-slate-500" : ""}`}
        >
          {label}
        </button>
      )}
    </form.Subscribe>
  );
}

function ErrorMessages({ errors }: { errors: Array<string | { message: string }> }) {
  return (
    <>
      {errors.map((error) => (
        <div
          key={typeof error === "string" ? error : error.message}
          className="text-red-500 text-xs mt-1 font-medium"
        >
          {typeof error === "string" ? error : error.message}
        </div>
      ))}
    </>
  );
}

export function Input({
  label,
  placeholder,
  icon: Icon,
  type = "text",
  description,
  disabled,
  value,
  onChange,
}: {
  label?: string;
  placeholder?: string;
  icon?: LucideIcon;
  type?: string;
  description?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={field.name}
          type={type}
          placeholder={placeholder}
          value={value !== undefined ? value : field.state.value || ""}
          onBlur={field.handleBlur}
          onChange={onChange || ((e) => field.handleChange(e.target.value))}
          disabled={disabled}
          aria-invalid={isInvalid}
        />
        <InputGroupAddon>{Icon && <Icon className="w-4 h-4 text-slate-400" />}</InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
}

export function TextArea({
  label,
  placeholder,
  rows = 5,
  className,
  icon: Icon,
}: {
  label?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  icon?: LucideIcon;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <Field>
      <FieldLabel htmlFor={field.name} className="flex items-center gap-1">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />} {label}
      </FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        rows={rows}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn("min-h-[80px]", className)}
        aria-invalid={isInvalid}
      />
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
}

export function Combobox({ label, placeholder }: { label?: string; placeholder?: string }) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <Field className="flex flex-col gap-2">
      <FieldLabel htmlFor={field.name} className="mb-0">
        {label}
      </FieldLabel>
      <ComboboxUI
        value={field.state.value}
        onValueChange={(val) => field.handleChange(val as Office)}
        aria-invalid={isInvalid}
      >
        <ComboboxInput placeholder={placeholder} className="w-full" />
        <ComboboxContent>
          <ComboboxList>
            {OFFICES.map((office) => (
              <ComboboxItem key={office} value={office}>
                {office}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </ComboboxUI>
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
}

export function Select({
  label,
  values,
  placeholder,
}: {
  label?: string;
  values: Array<{ label: string; value: string }>;
  placeholder?: string;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <Field>
      <FieldLabel htmlFor={label} className="text-[10px] font-bold text-slate-500 uppercase ml-1">
        {label}
      </FieldLabel>
      <SelectUI
        value={field.state.value}
        onValueChange={(val) => field.handleChange(val as Office)}
        aria-invalid={isInvalid}
      >
        <SelectTrigger id={field.name}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          {values.map((value) => (
            <SelectItem key={value.value} value={value.value}>
              {value.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectUI>
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
}

export function Checkbox({
  label,
  orientation = "horizontal",
  isChecked = false,
  isInvalid = false,
  disabled,
  icon: Icon,
  className,
  description,
}: {
  label?: string;
  orientation?: "vertical" | "horizontal";
  isChecked?: boolean;
  isInvalid?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  className?: string;
  description?: string;
}) {
  const field = useFieldContext<boolean>();
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <FieldGroup data-slot="checkbox-group">
      <Field orientation={orientation} data-invalid={isInvalid}>
        <CheckboxUI
          id={field.name}
          name={field.name}
          checked={field.state.value}
          onCheckedChange={(checked) => field.handleChange(checked === isChecked)}
          disabled={disabled}
          icon={Icon}
          className={className}
        />
        <FieldContent>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
      </Field>
      {field.state.meta.isTouched && <FieldError errors={errors} />}
    </FieldGroup>
  );
}

export function RadioGroup({
  defaultValue,
  options,
  className,
  itemClassName,
}: {
  defaultValue?: string;
  options: Array<{
    id: string;
    title: string;
    description: string;
    icon?: LucideIcon;
    activeClassName?: string;
    radioClassName?: string;
  }>;
  className?: string;
  itemClassName?: string;
}) {
  const field = useFieldContext<string>();
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <RadioGroupUI
      value={field.state.value ?? defaultValue}
      onValueChange={(val) => field.handleChange(val)}
      className={cn("w-full", className)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = field.state.value === option.id;

        return (
          <FieldLabel
            key={option.id}
            htmlFor={option.id}
            className={cn(
              "cursor-pointer transition-all border-2",
              isActive
                ? option.activeClassName || itemClassName
                : "border-slate-200 hover:bg-slate-50",
            )}
          >
            <Field orientation="horizontal" className="flex items-start justify-between w-full">
              <FieldContent className="order-1">
                <FieldTitle className="flex items-center gap-2 mb-1 text-sm font-bold">
                  {Icon && <Icon className="w-4 h-4" />}
                  {option.title}
                </FieldTitle>
                <FieldDescription className="text-xs text-slate-500">
                  {option.description}
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem
                className={cn("order-2 mt-0.5", option.radioClassName)}
                value={option.id}
                id={option.id}
              />
            </Field>
          </FieldLabel>
        );
      })}
      {field.state.meta.isTouched && <FieldError errors={errors} />}
    </RadioGroupUI>
  );
}

export function DateField({ label, className }: { label?: string; className?: string }) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errors = useStore(field.store, (state) => state.meta.errors);

  return (
    <div>
      <label htmlFor={label} className="text-[10px] font-bold text-slate-500 uppercase ml-1">
        {label}
        <input
          type="date"
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          className={cn(
            "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-500 placeholder:text-slate-400",
            className,
          )}
          aria-invalid={isInvalid}
        />
      </label>
      {isInvalid && <ErrorMessages errors={errors} />}
    </div>
  );
}

export function AssetField({
  label = "Attachments",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const field = useFieldContext<Asset[]>();
  const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const assets: Asset[] = field.state.value || [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      const filePromises = files.map(
        (file) =>
          new Promise<Asset>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                type: "file",
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                mimeType: file.type,
                url: reader.result as string,
              });
            };
            reader.readAsDataURL(file);
          }),
      );

      void Promise.all(filePromises).then((newAssets) => {
        field.handleChange([...assets, ...newAssets]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    const newLink: Asset = {
      id: Math.random().toString(36).substr(2, 9),
      type: "link",
      name: linkInput,
      url: linkInput.startsWith("http") ? linkInput : `https://${linkInput}`,
    };
    field.handleChange([...assets, newLink]);
    setLinkInput("");
    setShowLinkInput(false);
  };

  const removeAsset = (id: string) => {
    field.handleChange(assets.filter((a: Asset) => a.id !== id));
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-400">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Files
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(true)}
            className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition-all flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" /> Add Link
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {showLinkInput && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-2 animate-in fade-in slide-in-from-right-4 my-4">
          <InputUI
            type="text"
            value={linkInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === "Enter" && (e.preventDefault(), handleAddLink())
            }
            placeholder="Paste link (Word docs, References, etc.)"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleAddLink}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all animate-in fade-in zoom-in"
            >
              <div
                className={`p-2 rounded-lg ${
                  asset.type === "link"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {asset.type === "link" ? (
                  <LinkIcon className="w-3 h-3" />
                ) : asset.mimeType?.includes("image") ? (
                  <ImageIcon className="w-3 h-3" />
                ) : (
                  <FileIcon className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-700 truncate">{asset.name}</p>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
                  {asset.type === "link" ? "Reference" : asset.size}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAsset(asset.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {isInvalid && <ErrorMessages errors={errors} />}
    </div>
  );
}

export function Dropzone({
  label,
  description,
  className,
}: {
  label?: string;
  description?: string;
  className?: string;
}) {
  const field = useFieldContext<Asset[]>();
  const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const assets: Asset[] = field.state.value || [];

  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const urlsMap = objectUrlsRef.current;
    // Revoke all object URLs on unmount
    return () => {
      for (const url of urlsMap.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
      urlsMap.clear();
    };
  }, []);

  const handleDrop = (acceptedFiles: File[]) => {
    const newAssets: Asset[] = acceptedFiles.map((file) => {
      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.set(id, url);

      return {
        id,
        type: "file",
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        mimeType: file.type,
        url, // preview URL
        file,
      };
    });

    field.handleChange([...assets, ...newAssets]);
  };

  const removeAsset = (id: string) => {
    const url = objectUrlsRef.current.get(id);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      objectUrlsRef.current.delete(id);
    }
    field.handleChange(assets.filter((a: Asset) => a.id !== id));
  };

  return (
    <Field className={className}>
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
      <div className="mt-2 w-full space-y-4">
        <ReactDropzone onDrop={handleDrop}>
          {({ getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject }) => (
            <div
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border border-dashed py-10 px-6 transition-colors cursor-pointer",
                {
                  "border-primary bg-secondary": isDragActive && isDragAccept,
                  "border-destructive bg-destructive/20": isDragActive && isDragReject,
                  "border-slate-300 hover:bg-slate-50 hover:border-slate-400": !isDragActive,
                },
              )}
            >
              <input {...getInputProps()} id={field.name} />
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-600 mb-1">
                {isDragActive ? "Drop files here" : "Click or drag files to upload"}
              </p>
              <p className="text-xs text-slate-400">Support for all file types</p>
            </div>
          )}
        </ReactDropzone>

        {assets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl relative group"
              >
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{asset.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{asset.size}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAsset(asset.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all opacity-0 md:group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
}
