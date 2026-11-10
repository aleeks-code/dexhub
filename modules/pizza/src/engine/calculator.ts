export interface DoughInput {
  doughsNumber: number
  doughsWeight: number
  hydration: number // % (e.g. 65)
  saltPerLiter: number // g/L (e.g. 50)
  fatsPerLiter: number // g/L (e.g. 0 for round, 25-30 for pan)
  roomTemp: number // °C (e.g. 21)
  risingTime: number // total hours (e.g. 8)
  fridgeRisingTime: number // hours in fridge (e.g. 0)
  isGrandmaPizza: boolean // true = pizza in teglia / grandma pizza
}

export interface DoughRecipe {
  input: DoughInput
  totalWeight: number // grams
  flour: number // grams
  water: number // grams
  salt: number // grams
  fats: number // grams
  freshYeast: number // grams
  dryYeast: number // grams
  bakersPercentages: {
    flour: number
    water: number
    salt: number
    fats: number
    freshYeast: number
  }
}

export interface PanCalcInput {
  shape: 'rectangular' | 'round'
  width?: number // cm (rectangular)
  length?: number // cm (rectangular)
  diameter?: number // cm (round)
  thicknessFactor: number // g/cm² (standard: 0.55, soft/high: 0.60, thin/crispy: 0.50)
}

/**
 * Calculates pan dough weight from dimensions and desired dough thickness.
 * Standard formula used by pizzaioli: Area (cm²) * thickness factor (g/cm²)
 */
export function calculatePanWeight(input: PanCalcInput): number {
  let areaCm2 = 0
  if (input.shape === 'rectangular') {
    const w = Math.max(0, input.width ?? 0)
    const l = Math.max(0, input.length ?? 0)
    areaCm2 = w * l
  } else {
    const radius = Math.max(0, (input.diameter ?? 0) / 2)
    areaCm2 = Math.PI * radius * radius
  }
  const factor = Math.max(0.3, Math.min(0.9, input.thicknessFactor || 0.55))
  return Math.round(areaCm2 * factor)
}

/**
 * Core mathematical engine matching Calcolapizza (La Confraternita della Pizza).
 */
export function calculateDough(input: DoughInput): DoughRecipe {
  const doughsNumber = Math.max(1, Math.round(input.doughsNumber || 1))
  const doughsWeight = Math.max(10, input.doughsWeight || 250)
  const totalDoughWeight = doughsNumber * doughsWeight

  const hydration = Math.max(40, Math.min(95, input.hydration || 60))
  const saltPerLiter = Math.max(0, input.saltPerLiter ?? 50)
  const fatsPerLiter = Math.max(0, input.fatsPerLiter ?? 0)
  const roomTemp = Math.max(5, Math.min(45, input.roomTemp ?? 20))
  const risingTime = Math.max(1, input.risingTime ?? 8)
  const fridgeRisingTime = Math.max(0, Math.min(risingTime, input.fridgeRisingTime ?? 0))
  const isGrandmaPizza = Boolean(input.isGrandmaPizza)

  // Calcolapizza formula:
  // c = risingTime - 9 * fridgeRisingTime / 10
  const c = Math.max(0.1, risingTime - (9 * fridgeRisingTime) / 10)

  // C = (hydration * (saltPerLiter + fatsPerLiter) + 10^3 * (hydration + 100))
  const C = hydration * (saltPerLiter + fatsPerLiter) + 1000 * (hydration + 100)

  // Temperature factor n (reduced by 25% if grandma/teglia pizza)
  const n = isGrandmaPizza ? roomTemp * 0.75 : roomTemp

  // Denominator polynomial for hydration:
  const polyH = Math.max(1, 4.2 * hydration - 80 - 0.0305 * hydration * hydration)

  // Yeast coefficient h:
  const h =
    (2250 * (1 + saltPerLiter / 200) * (1 + fatsPerLiter / 300)) /
    (polyH * Math.pow(n, 2.5) * Math.pow(c, 1.2))

  // Ingredients:
  const flourRaw = (100000 * totalDoughWeight) / C
  const waterRaw = (1000 * hydration * totalDoughWeight) / C
  const saltRaw = (saltPerLiter * hydration * totalDoughWeight) / C
  const fatsRaw = (fatsPerLiter * hydration * totalDoughWeight) / C
  const freshYeastRaw = flourRaw * h
  const dryYeastRaw = freshYeastRaw / 3

  // Round values:
  const flour = Math.round(flourRaw)
  const water = Math.round(waterRaw)
  const salt = Math.round(saltRaw * 10) / 10
  const fats = Math.round(fatsRaw * 10) / 10
  const freshYeast = Math.round(freshYeastRaw * 100) / 100
  const dryYeast = Math.round(dryYeastRaw * 100) / 100

  const safeFlour = flour || 1

  return {
    input: {
      doughsNumber,
      doughsWeight,
      hydration,
      saltPerLiter,
      fatsPerLiter,
      roomTemp,
      risingTime,
      fridgeRisingTime,
      isGrandmaPizza,
    },
    totalWeight: totalDoughWeight,
    flour,
    water,
    salt,
    fats,
    freshYeast,
    dryYeast,
    bakersPercentages: {
      flour: 100,
      water: Math.round((water / safeFlour) * 1000) / 10,
      salt: Math.round((salt / safeFlour) * 1000) / 10,
      fats: Math.round((fats / safeFlour) * 1000) / 10,
      freshYeast: Math.round((freshYeast / safeFlour) * 1000) / 10,
    },
  }
}

/**
 * Formats recipe nicely for clipboard sharing (compatible with Calcolapizza share format).
 */
export function formatRecipeShareText(name: string, recipe: DoughRecipe): string {
  const { input, flour, water, salt, fats, freshYeast, dryYeast, totalWeight } = recipe
  const panettoText =
    input.doughsNumber === 1
      ? `1 panetto (${input.doughsWeight}g)`
      : `${input.doughsNumber} panetti (${input.doughsWeight}g cadauno)`

  const tipologia = input.isGrandmaPizza ? 'Pizza in teglia' : 'Pizza tonda classica'

  return [
    `🍕 ${name || 'Ricetta Pizza'} (${tipologia})`,
    `Impasto totale: ${totalWeight}g — ${panettoText}`,
    `Idratazione: ${input.hydration}%`,
    '',
    '📋 INGREDIENTI:',
    `• Farina: ${flour}g`,
    `• Acqua: ${water}g (o ml)`,
    `• Sale: ${salt}g (${input.saltPerLiter}g/L)`,
    fats > 0 ? `• Olio / Strutto: ${fats}g (${input.fatsPerLiter}g/L)` : null,
    `• Lievito di birra fresco: ${freshYeast}g (oppure ${dryYeast}g secco)`,
    '',
    '⏱️ LIEVITAZIONE:',
    `• Tempo totale: ${input.risingTime} ore a ${input.roomTemp}°C`,
    input.fridgeRisingTime > 0
      ? `• Di cui in frigorifero (4°C): ${input.fridgeRisingTime} ore (${input.risingTime - input.fridgeRisingTime}h a TA)`
      : '• Tutto a temperatura ambiente',
    '',
    'Calcolato con CalcolaPizza per DexHub',
  ]
    .filter(Boolean)
    .join('\n')
}
