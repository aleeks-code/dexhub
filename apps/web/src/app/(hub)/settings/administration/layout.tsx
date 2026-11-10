'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/core/hooks/use-me'

export default function AdministrationLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading: meLoading } = useMe()
  const router = useRouter()

  useEffect(() => {
    if (!meLoading && !me?.isAdmin) {
      router.replace('/home')
    }
  }, [me, meLoading, router])

  if (meLoading || !me?.isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        Caricamento…
      </div>
    )
  }

  return <>{children}</>
}
