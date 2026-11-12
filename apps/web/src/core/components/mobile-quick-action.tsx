'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, CheckSquare, Briefcase } from 'lucide-react'
import { QuickCaptureModal } from './quick-capture-modal'

export function MobileQuickAction() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'note' | 'task'>('note')
  const router = useRouter()

  function openModal(tab: 'note' | 'task') {
    setModalTab(tab)
    setMenuOpen(false)
    setModalOpen(true)
  }

  function goToWorklog() {
    setMenuOpen(false)
    router.push('/worklog')
  }

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Speed Dial Menu items */}
      <div className="fixed bottom-[4.85rem] right-4 z-40 flex flex-col items-end gap-2.5 md:hidden pointer-events-none">
        {menuOpen && (
          <div className="flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto">
            {/* Quick Note */}
            <button
              type="button"
              onClick={() => openModal('note')}
              className="flex items-center gap-2.5 rounded-full bg-surface-raised border border-border px-3.5 py-2 shadow-lg hover:bg-surface text-text transition-all"
            >
              <span className="text-xs font-semibold">Nuova Nota</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <FileText className="h-3.5 w-3.5" />
              </div>
            </button>

            {/* Quick Task */}
            <button
              type="button"
              onClick={() => openModal('task')}
              className="flex items-center gap-2.5 rounded-full bg-surface-raised border border-border px-3.5 py-2 shadow-lg hover:bg-surface text-text transition-all"
            >
              <span className="text-xs font-semibold">Nuovo Task</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                <CheckSquare className="h-3.5 w-3.5" />
              </div>
            </button>

            {/* Quick Worklog */}
            <button
              type="button"
              onClick={goToWorklog}
              className="flex items-center gap-2.5 rounded-full bg-surface-raised border border-border px-3.5 py-2 shadow-lg hover:bg-surface text-text transition-all"
            >
              <span className="text-xs font-semibold">Registra Ore</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* Floating Action Button (FAB) */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Chiudi menu rapido' : 'Azioni rapide'}
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 pointer-events-auto ${
            menuOpen ? 'rotate-45 bg-rose-500' : ''
          }`}
        >
          <Plus className="h-6 w-6 transition-transform duration-200" />
        </button>
      </div>

      {/* Modal */}
      <QuickCaptureModal
        open={modalOpen}
        initialTab={modalTab}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
