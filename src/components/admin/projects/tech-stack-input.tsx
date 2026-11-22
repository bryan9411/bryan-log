"use client"

import { TagInput } from "@/components/forms/tag-input"
import {
  TECH_STACK_FIELD,
  TECH_STACK_MAX_ITEMS,
  TECH_TAG_MAX_LENGTH,
} from "@/lib/validations/project"

type TechStackInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  errors?: string[]
}

export function TechStackInput({ value, onChange, errors }: TechStackInputProps) {
  return (
    <TagInput
      id={TECH_STACK_FIELD}
      name={TECH_STACK_FIELD}
      label="技術標籤"
      tagNoun="技術標籤"
      value={value}
      onChange={onChange}
      maxItems={TECH_STACK_MAX_ITEMS}
      maxLength={TECH_TAG_MAX_LENGTH}
      placeholder="例如：Next.js、Supabase"
      mono
      errors={errors}
    />
  )
}
