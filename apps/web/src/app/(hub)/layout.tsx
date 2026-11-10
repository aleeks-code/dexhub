import { Sidebar } from '@/core/components/sidebar'
import { MobileNav } from '@/core/components/mobile-nav'
import { MobileHeader } from '@/core/components/mobile-header'
import { CommandPalette } from '@/core/components/command-palette'
import { ModuleBootstrapper } from '@/core/components/module-bootstrapper'
import { MobileQuickAction } from '@/core/components/mobile-quick-action'
import { BroadcastBanner } from '@/core/components/broadcast-banner'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <BroadcastBanner />
        <MobileHeader />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">{children}</div>
      </main>
      <MobileNav />
      <MobileQuickAction />
      <CommandPalette />
      <ModuleBootstrapper />
    </div>
  )
}
