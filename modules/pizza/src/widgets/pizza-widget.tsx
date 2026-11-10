'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pizza, ArrowRight, Sliders } from 'lucide-react'
import { listSavedRecipes, type SavedRecipe } from '../services/pizza-service'
import { calculateDough } from '../engine/calculator'

export default function PizzaWidget() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSavedRecipes()
      .then(setRecipes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const latest = recipes[0]
  const calculated = latest ? calculateDough(latest.input) : null

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Pizza className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-text">CalcolaPizza</span>
        </div>
        <Link
          href="/pizza"
          className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-primary transition-colors"
        >
          Apri <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-text-subtle">
          Caricamento…
        </div>
      ) : latest && calculated ? (
        <div className="flex flex-1 flex-col justify-center gap-2">
          <div className="flex items-center justify-between">
            <span className="truncate text-xs font-medium text-text">{latest.name}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {latest.input.isGrandmaPizza ? 'Teglia' : 'Tonda'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-md bg-overlay-subtle p-2 text-center text-[11px] font-mono">
            <div>
              <div className="text-[9px] text-text-subtle font-sans">Farina</div>
              <div className="font-bold text-text">{calculated.flour}g</div>
            </div>
            <div>
              <div className="text-[9px] text-text-subtle font-sans">Acqua</div>
              <div className="font-bold text-primary">{calculated.water}g</div>
            </div>
            <div>
              <div className="text-[9px] text-text-subtle font-sans">Sale</div>
              <div className="font-bold text-text">{calculated.salt}g</div>
            </div>
            <div>
              <div className="text-[9px] text-text-subtle font-sans">Lievito</div>
              <div className="font-bold text-text">{calculated.freshYeast}g</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs text-text-subtle">Calcola le dosi perfette per pizza tonda o in teglia.</p>
          <Link
            href="/pizza"
            className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" /> Nuovo impasto
          </Link>
        </div>
      )}
    </div>
  )
}
