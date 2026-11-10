import {
  and, desc, eq, getClient, lte,
  worklogCcnlProfile, worklogCometaConfig, worklogContract, worklogFiscalProfile,
  worklogRetribuzione, worklogUserFiscalConfig,
} from '@dexhub/db'
import { computeCometaMensile, computeRalTeoricoAnnuo, computeRetribuzioneFissaMensile, type RetribuzioneFissaComponenti, type ScaglioneFiscale } from '@dexhub/worklog-engine'
import { resolveStima, type StimaBlocker } from './stima.resolver'

// ─── Public contract ──────────────────────────────────────────────────────────
//
// Il conguaglio è un dato ANNUALE ancorato a OGGI, non al mese che l'utente sta navigando —
// deve restituire lo stesso numero indipendentemente dalla card che lo interroga. Per design
// copre solo l'anno solare in corso: non esiste un "anno diverso da quello corrente" da
// gestire qui — una vista sul consuntivo di un anno CHIUSO (niente mese in corso, niente
// futuri: è un consuntivo, non una previsione) sarà una funzione separata, se servirà.

export type ConguaglioStatus = 'ok' | 'anno_incompleto' | 'dati_inconsistenti' | 'dati_insufficienti'

// Sotto questa soglia di mesi COMPLETI, proiettare l'anno intero è statisticamente senza senso.
export const CONGUAGLIO_MESI_MINIMI = 4

export interface ConguaglioRawOutput {
  scaglioni: ScaglioneFiscale[]
  imponibiliMensiliReali: number[]   // un valore per mese Gen→oggi NON bloccato (buco_mese saltato, non azzerato)
  imponibiliNominaliMensili: number[]  // parallelo al precedente: la base teorica DI QUEL mese
  ralTeoricoImponibile: number       // ricostruito su tutto l'anno, vedi computeRalTeoricoAnnuo
  mesiAttesiReali: number            // mesi tentati quest'anno fino a oggi (bloccati inclusi)
}

export type ConguaglioRawResolution =
  | { ok: true; status: 'ok'; output: ConguaglioRawOutput }
  | { ok: true; status: 'dati_insufficienti'; mesiCompleti: number; mesiMinimi: number }
  | { ok: true; status: 'anno_incompleto' | 'dati_inconsistenti' }
  | { ok: false; reason: StimaBlocker }

// ─── Resolver ─────────────────────────────────────────────────────────────────

// ponytail: query di config duplicata (non riusa stima.resolver.ts) — evita di riaprire
// il resolver mensile già stabile/non testato automaticamente per un endpoint annuale diverso.
export async function resolveConguaglioRaw(userId: string): Promise<ConguaglioRawResolution> {
  const db = getClient()
  const oggi = new Date()
  const annoOggi = oggi.getFullYear()
  const meseOggiNum = oggi.getMonth() + 1
  const meseOggi = `${annoOggi}-${String(meseOggiNum).padStart(2, '0')}`

  const [config] = await db
    .select().from(worklogUserFiscalConfig)
    .where(eq(worklogUserFiscalConfig.userId, userId)).limit(1)
  if (!config) return { ok: false, reason: 'no_user_config' }

  const [ccnl] = await db
    .select().from(worklogCcnlProfile)
    .where(eq(worklogCcnlProfile.id, config.ccnlId)).limit(1)
  if (!ccnl) return { ok: false, reason: 'no_ccnl_profile' }

  const [retrib] = await db
    .select().from(worklogRetribuzione)
    .where(and(eq(worklogRetribuzione.userId, userId), lte(worklogRetribuzione.decorrenza, meseOggi)))
    .orderBy(desc(worklogRetribuzione.decorrenza)).limit(1)
  if (!retrib) return { ok: false, reason: 'no_retribuzione' }

  const [fiscal] = await db
    .select().from(worklogFiscalProfile)
    .where(eq(worklogFiscalProfile.anno, annoOggi)).limit(1)
  if (!fiscal) return { ok: false, reason: 'no_fiscal_profile' }

  const [contract] = await db
    .select().from(worklogContract)
    .where(eq(worklogContract.userId, userId)).limit(1)
  if (!contract) return { ok: false, reason: 'no_contract' }

  const divisoreOrario = parseFloat(ccnl.divisoreOrario)
  const { componenti, componentiDichiarati } = resolveRetribuzioneFissaComponentiPerConguaglio(retrib, divisoreOrario)
  const retribuzioneMensile = computeRetribuzioneFissaMensile(componenti)
  // Cometa (Diff 2, Step 0-bis) — SOLO il minimo tabellare vero, mai il bucket legacy/orario
  // sintetizzato sopra (stesso canale pulito già usato dal resolver mensile per CGIL/Cometa).
  const minimoTabellareReale = componentiDichiarati ? componenti.minimoTabellare : null

  // Cometa config — query SEMPRE eseguita, stesso pattern del resolver mensile ("riga assente"
  // = non iscritto, mai un blocker). Duplicata qui apposta (vedi nota ponytail sotto).
  const [cometaConfig] = await db
    .select()
    .from(worklogCometaConfig)
    .where(eq(worklogCometaConfig.userId, userId))
    .limit(1)
  const coefficienteCometa = cometaConfig?.iscritto
    ? (cometaConfig.coefficiente != null ? parseFloat(cometaConfig.coefficiente) : 0)
    : 0

  // ── Check "anno completo": esiste una retribuzione vigente a GENNAIO? ──────
  // NON "decorrenza nel mese di gennaio" — una decorrenza di novembre scorso copre gennaio
  // (dipendente di lungo corso). Se manca del tutto → rapporto iniziato durante l'anno.
  //
  // LIMITE NOTO (non risolto qui): un vuoto contrattuale nel mezzo (es. aspettativa) che
  // resta "coperto" da una decorrenza vecchia ancora valida NON viene rilevato — la query
  // trova comunque una decorrenza <= mese e quel mese conta come lavorato. Questo check
  // cattura solo "decorrenza assente", non "decorrenza vecchia che finge di coprire un vuoto".
  const [retribGennaio] = await db
    .select().from(worklogRetribuzione)
    .where(and(
      eq(worklogRetribuzione.userId, userId),
      lte(worklogRetribuzione.decorrenza, `${annoOggi}-01`),
    ))
    .orderBy(desc(worklogRetribuzione.decorrenza)).limit(1)

  if (!retribGennaio) {
    return { ok: true, status: 'anno_incompleto' }
  }

  // ── Gennaio → oggi: no_retribuzione ora NON è più atteso ────────────────────
  // (gennaio è coperto ⇒ ogni mese successivo lo è per costruzione, decorrenza monotona.
  // Se ricompare, è un buco di decorrenza nel mezzo: dati inconsistenti, non anno parziale.)
  //
  // Il mese odierno (m === meseOggiNum) entra PRO-QUOTA, non escluso e non intero: resolveStima
  // usa già internamente la data reale di oggi per azzerare i giorni futuri DENTRO il mese
  // (stesso gate del maturato progressivo della stima mensile) — nessuna logica aggiuntiva qui.
  // Normalizzazione temporale (2026-09-10): retribuzione e aliquota INPS sono time-versioned
  // (decorrenze; +0,30% CIGS solo nei mesi con ore CIG). Ogni mese porta quindi il SUO nominale,
  // letto direttamente da resolveStima — che l'ha già calcolato con la config di quel mese.
  const imponibiliMensiliReali: number[] = []
  const imponibiliNominaliMensili: number[] = []
  // Un elemento per OGNI mese trascorso (bloccati inclusi), per ricostruire il RAL teorico.
  const nominaliMesiTrascorsi: number[] = []

  for (let m = 1; m <= meseOggiNum; m++) {
    const mese = `${annoOggi}-${String(m).padStart(2, '0')}`
    const resolution = await resolveStima(userId, mese)

    if (resolution.ok) {
      const nominale = resolution.output.imponibileNominaleMensile
      imponibiliMensiliReali.push(resolution.output.imponibileIrpefMensile)
      imponibiliNominaliMensili.push(nominale)
      nominaliMesiTrascorsi.push(nominale)
    } else if (resolution.reason === 'buco_mese') {
      // Mese bloccato: nessun imponibile reale (resta fuori dal delta, non azzerato) ma un posto
      // nel RAL teorico serve comunque. Segnaposto: riempito dopo col nominale corrente, perché
      // quello dei mesi successivi potrebbe non essere ancora noto a questo punto del loop.
      nominaliMesiTrascorsi.push(Number.NaN)
      continue
    } else if (resolution.reason === 'no_retribuzione') {
      return { ok: true, status: 'dati_inconsistenti' }
    } else {
      return { ok: false, reason: resolution.reason }
    }
  }

  // ── Soglia minima dati: su length (mesi con dati reali), non mesiAttesiReali ───────────
  if (imponibiliMensiliReali.length < CONGUAGLIO_MESI_MINIMI) {
    return {
      ok: true,
      status: 'dati_insufficienti',
      mesiCompleti: imponibiliMensiliReali.length,
      mesiMinimi: CONGUAGLIO_MESI_MINIMI,
    }
  }

  // Nominale ASSUNTO per i mesi non osservati (futuri e bloccati): retribuzione vigente oggi,
  // aliquota INPS **di base**, Cometa corrente.
  // ⚠️ Deliberatamente NON il nominale dell'ultimo mese risolto: se quel mese aveva ore CIG
  // porterebbe il +0,30% CIGS, proiettando sul resto dell'anno una condizione contingente.
  // La CIGS è un fatto del singolo mese, non una previsione.
  const nominaleAssunto = Math.round(
    (retribuzioneMensile * (1 - parseFloat(fiscal.contributiInps))
      - computeCometaMensile(coefficienteCometa, minimoTabellareReale)) * 100,
  ) / 100

  // I mesi bloccati non hanno un nominale proprio: assumono quello corrente, come i futuri.
  const nominaliAnno = nominaliMesiTrascorsi.map((n) => (Number.isNaN(n) ? nominaleAssunto : n))

  return {
    ok: true,
    status: 'ok',
    output: {
      scaglioni: fiscal.scaglioniIrpef,
      imponibiliMensiliReali,
      imponibiliNominaliMensili,
      ralTeoricoImponibile: computeRalTeoricoAnnuo(nominaliAnno, nominaleAssunto, config.mensilita),
      mesiAttesiReali: meseOggiNum,
    },
  }
}

// ponytail: mirror intenzionale di resolveRetribuzioneFissaComponenti in stima.resolver.ts
// (stessa policy del file: duplicare, non riaprire il resolver mensile). `componentiDichiarati`
// aggiunto per Cometa (Diff 2) — stesso canale pulito già usato dal resolver mensile per CGIL/
// Cometa, la quadratura resta non surfaced su questo endpoint (invariato).
function resolveRetribuzioneFissaComponentiPerConguaglio(
  retrib: { tipo: 'hourly' | 'monthly'; importo: string; premioFisso: string | null
    minimoTabellare: string | null; superminimo: string | null
    scattiAnzianita: string | null; premioProduzioneFisso: string | null },
  divisoreOrario: number,
): { componenti: RetribuzioneFissaComponenti; componentiDichiarati: boolean } {
  const importo = parseFloat(retrib.importo)

  if (retrib.tipo === 'hourly') {
    return {
      componenti: { minimoTabellare: importo * divisoreOrario, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0 },
      componentiDichiarati: false,
    }
  }

  const dichiarati = retrib.minimoTabellare != null && retrib.superminimo != null
    && retrib.scattiAnzianita != null && retrib.premioProduzioneFisso != null

  if (!dichiarati) {
    const bucket = importo + (retrib.premioFisso ? parseFloat(retrib.premioFisso) : 0)
    return {
      componenti: { minimoTabellare: bucket, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0 },
      componentiDichiarati: false,
    }
  }

  return {
    componenti: {
      minimoTabellare: parseFloat(retrib.minimoTabellare!),
      superminimo: parseFloat(retrib.superminimo!),
      scattiAnzianita: parseFloat(retrib.scattiAnzianita!),
      premioProduzioneFisso: parseFloat(retrib.premioProduzioneFisso!),
    },
    componentiDichiarati: true,
  }
}
