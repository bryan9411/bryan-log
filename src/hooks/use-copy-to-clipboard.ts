"use client"

import { useEffect, useRef, useState } from "react"

const COPIED_RESET_MS = 2000

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return false
    }

    setIsCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsCopied(false), COPIED_RESET_MS)

    return true
  }

  return { isCopied, copy }
}
