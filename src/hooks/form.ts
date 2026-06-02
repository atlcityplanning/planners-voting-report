import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "@/hooks/form-context";

import {
  Checkbox,
  Combobox,
  Dropzone,
  Input,
  RadioGroup,
  Select,
  SubscribeButton,
  TextArea,
} from "@/components/voting-report/form.components";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    Checkbox,
    Combobox,
    Dropzone,
    Input,
    RadioGroup,
    Select,
    TextArea,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
});
