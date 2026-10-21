import { z } from "zod"

export const THEME = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const

export const themeSchema = z.enum([THEME.LIGHT, THEME.DARK, THEME.SYSTEM])

export type Theme = z.infer<typeof themeSchema>

export const THEME_STORAGE_KEY = "bryan-log-theme"
