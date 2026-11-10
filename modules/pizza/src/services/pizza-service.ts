import type { ModuleContext } from '@dexhub/sdk'
import type { DoughInput } from '../engine/calculator'

export interface SavedRecipe {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  input: DoughInput
  notes?: string
}

const STORAGE_KEY = 'dexhub:pizza:saved_recipes'
const KV_KEY_RECIPES = 'saved_recipes'

let _ctx: ModuleContext | null = null

export function initPizzaService(ctx: ModuleContext): void {
  _ctx = ctx
}

export const PRESET_RECIPES: Array<{
  id: string
  name: string
  badge: string
  description: string
  input: DoughInput
}> = [
  {
    id: 'napoletana-classica',
    name: 'Napoletana Classica (8h TA)',
    badge: 'Tonda',
    description: 'La classica verace napoletana cotta ad alta temperatura (60% idratazione, 8 ore a temperatura ambiente)',
    input: {
      doughsNumber: 3,
      doughsWeight: 250,
      hydration: 60,
      saltPerLiter: 50,
      fatsPerLiter: 0,
      roomTemp: 21,
      risingTime: 8,
      fridgeRisingTime: 0,
      isGrandmaPizza: false,
    },
  },
  {
    id: 'napoletana-contemporanea',
    name: 'Napoletana Contemporanea (24h Frigo)',
    badge: 'Tonda 24h',
    description: 'Cornicione pronunciato, impasto ad alta digeribilità maturato 18h in frigo e 6h appretto',
    input: {
      doughsNumber: 4,
      doughsWeight: 260,
      hydration: 68,
      saltPerLiter: 45,
      fatsPerLiter: 0,
      roomTemp: 20,
      risingTime: 24,
      fridgeRisingTime: 18,
      isGrandmaPizza: false,
    },
  },
  {
    id: 'teglia-romana',
    name: 'Teglia Romana Alta Idratazione (48h Frigo)',
    badge: 'Teglia 48h',
    description: 'Mollica ariosa e fondo croccante per teglia 30×40 (80% idratazione, olio evo nell’impasto)',
    input: {
      doughsNumber: 2,
      doughsWeight: 550,
      hydration: 80,
      saltPerLiter: 40,
      fatsPerLiter: 25,
      roomTemp: 20,
      risingTime: 48,
      fridgeRisingTime: 42,
      isGrandmaPizza: true,
    },
  },
  {
    id: 'teglia-rapida',
    name: 'Pizza in Teglia Rapida (6h TA)',
    badge: 'Teglia 6h',
    description: 'Impasto casalingo morbido e saporito in giornata, perfetto per una teglia serale',
    input: {
      doughsNumber: 2,
      doughsWeight: 500,
      hydration: 65,
      saltPerLiter: 45,
      fatsPerLiter: 30,
      roomTemp: 22,
      risingTime: 6,
      fridgeRisingTime: 0,
      isGrandmaPizza: true,
    },
  },
]

function getLocalRecipes(): SavedRecipe[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedRecipe[]) : []
  } catch {
    return []
  }
}

function saveLocalRecipes(recipes: SavedRecipe[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  } catch {
    // Ignore storage quota errors
  }
}

export async function listSavedRecipes(): Promise<SavedRecipe[]> {
  if (_ctx?.kv) {
    try {
      const remote = await _ctx.kv.get<SavedRecipe[]>(KV_KEY_RECIPES)
      if (remote && Array.isArray(remote)) {
        saveLocalRecipes(remote)
        return remote
      }
    } catch {
      // Fallback to local storage if API is momentarily unreachable
    }
  }
  return getLocalRecipes()
}

export async function saveRecipe(name: string, input: DoughInput, notes?: string): Promise<SavedRecipe> {
  const current = await listSavedRecipes()
  const newRecipe: SavedRecipe = {
    id: `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'Mio Impasto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    input,
    notes,
  }
  const updated = [newRecipe, ...current]
  saveLocalRecipes(updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_RECIPES, updated)
    } catch (err) {
      console.warn('[PizzaService] Failed to sync to KV:', err)
    }
  }

  return newRecipe
}

export async function deleteRecipe(id: string): Promise<void> {
  const current = await listSavedRecipes()
  const updated = current.filter((r) => r.id !== id)
  saveLocalRecipes(updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_RECIPES, updated)
    } catch (err) {
      console.warn('[PizzaService] Failed to sync deletion to KV:', err)
    }
  }
}
