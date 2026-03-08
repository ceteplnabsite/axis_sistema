"use client"

import { SessionProvider } from "next-auth/react"
import { SessionTimerProvider } from "@/contexts/SessionTimerContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionTimerProvider>
        {children}
      </SessionTimerProvider>
    </SessionProvider>
  )
}
