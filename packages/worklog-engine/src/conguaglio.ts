/**
 * Fase 3 Passo 2 — RAL effettivo proiettato + avviso conguaglio.
 * Pure, zero I/O — orchestrazione multi-mese resta al resolver (chiama resolveStima per mese).
 *
 * MODELLO (delta rispetto al RAL teorico, non ricostruzione da zero):
 * Sommare i 12 imponibili mensili e confrontarli col RAL teorico (mensile × mensilità) non
 * torna — mensilità (13/14) è un conteggio fiscale, il loop calendario ha solo 12 iterazioni,
 * quindi darebbe un conguaglio ≠ 0 anche senza straordinari (falso allarme strutturale).
 * Si lavora invece sul DELTA: quanto imponibile mensile ECCEDE il nominale (extra_m), sommato
 * sui mesi reali validi + proiettato sui mesi futuri, per ottenere l'imponibile annuo EFFETTIVO.
 *
 * FORMULA (rivista 2026-09-10 — vedi TC-F/G/H in conguaglio.test.ts):
 *   trattenuto nell'anno = α · R_eff − D     ← stima.ts trattiene imponibile × aliquotaMediaLorda
 *   dovuto a fine anno   = L(R_eff) − D
 *   D (detrazioni) si semplifica: è ancorata al RAL teorico in ENTRAMBI i termini.
 *   ⇒  conguaglio = L(R_eff) − α · R_eff        con α = L(R_teo) / R_teo
 *
 * Il delta NON è un fattore moltiplicativo: entra solo dentro R_eff = R_teo + delta. La versione
 * precedente faceva `delta × (marginaleEff − marginaleTeorico)`, che assumeva una trattenuta
 * mensile al MARGINALE — vero col vecchio split ordinario/extra, falso dal modello "busta"
 * (base unica × aliquota media). Sbagliava in due modi: applicava l'aliquota alta a TUTTO il
 * delta anche quando solo una parte supera lo scaglione (TC-G: 170 invece di 100), e dava 0
 * ogni volta che il marginale non cambiava, ignorando il divario media/marginale (TC-H: 0
 * invece di 107.69).
 *
 * CONFINI DICHIARATI (non modellati, con la direzione dell'errore):
 *  - Detrazioni ancorate al RAL teorico: il sostituto le ricalcola su R_eff e l'art.13 CALA al
 *    crescere del reddito → il conguaglio reale è più GRANDE di questo. Sottostima.
 *  - Clamp incapienza mensile (`max(0, …)` in computeIrpefMensile): se è scattato si è trattenuto
 *    più di α·R_eff−D → sovrastima.
 *  - Tredicesima: R_teo usa `mensilita` (13) ma il loop mesi è 12. La derivazione regge assumendo
 *    che la 13ª sia trattenuta ad α sul nominale, cioè che il delta catturi TUTTE le deviazioni.
 */

import { marginalRate, computeIrpefLorda, type ScaglioneFiscale } from './stima'

/**
 * NORMALIZZAZIONE TEMPORALE (2026-09-10) — il motore non ricostruisce più la storia.
 *
 * Prima riceveva `retribuzioneMensile` + `contributiInpsRate` come SCALARI e derivava da soli
 * il nominale mensile e il RAL teorico. Entrambi quei valori sono però time-versioned nel
 * dominio: la retribuzione ha decorrenze, e l'aliquota INPS porta +0,30% CIGS solo nei mesi
 * con ore CIG. Sintetizzarli in un numero solo era una menzogna strutturale (e nascondeva la
 * lettura della colonna deprecata `contributiInpsOverride` nel resolver).
 *
 * Ora il RESOLVER — l'unico che vede il DB e la storia — consegna dati già normalizzati:
 * il vettore dei nominali mensili e il RAL teorico già ricostruito sull'anno. Il motore resta
 * puro e fa solo aritmetica.
 */
export interface StimaConguaglioInput {
  scaglioni: ScaglioneFiscale[]
  /** imponibileIrpefMensile per ogni mese reale VALIDO (bloccati esclusi, non azzerati) */
  imponibiliMensiliReali: number[]
  /**
   * Base TEORICA del mese corrispondente — stesso ordine e stessa lunghezza di
   * `imponibiliMensiliReali`, un elemento per mese realmente ricostruito.
   * N_m = retribuzioneFissaVigente(m) × (1 − rateINPS(m)) − cometaMensile.
   * ⚠️ NON derivarlo dall'imponibile effettivo del mese: `extra` collasserebbe a 0 per
   * costruzione e il conguaglio sarebbe sempre nullo.
   */
  imponibiliNominaliMensili: number[]
  /**
   * Imponibile IRPEF annuo teorico, ricostruito dal resolver su TUTTO l'anno:
   *   R_teo = Σ N_m (12 mesi solari) + (mensilita − 12) × N_dicembre
   * Mesi non ancora trascorsi → nominale corrente (ultima config nota, nessuna CIGS futura):
   * scelta "stima ad oggi", nessuna proiezione implicita.
   */
  ralTeoricoImponibile: number
  mesiAttesiReali: number            // mesi da Gennaio al corrente tentati, bloccati inclusi (per il disclaimer N/M)
  mesiFuturi: number                 // mesi da fine anno non ancora arrivati
  proiezione: 'prudente' | 'storico' // prudente = extra futuro 0; storico = media dei mesi reali validi
}

export interface StimaConguaglioOutput {
  mesiCompletiUsati: number
  mesiAttesiReali: number
  /** esposti per rendere verificabile l'identita' contabile R_eff = R_teo + delta */
  ralTeoricoImponibile: number
  ralEffettivoImponibile: number
  deltaImponibileAnnuo: number
  marginaleTeorico: number
  marginaleEffettivo: number
  conguaglioStimato: number
  warningConguaglio: boolean   // |conguaglioStimato| > 200€
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Assembla il RAL teorico imponibile dell'anno dai nominali mensili.
 *
 *   R_teo = Σ N_m (mesi trascorsi) + mesiFuturi × N_corrente + (mensilita − 12) × N_corrente
 *
 * I mesi non ancora trascorsi e le mensilita' aggiuntive (13a/14a) usano il NOMINALE CORRENTE
 * — ultima configurazione nota, nessuna CIGS futura. E' una scelta deliberata: l'endpoint e'
 * una "stima ad oggi" e non proietta. Usare la media storica dei mesi trascorsi spalmerebbe
 * una variazione salariale gia' avvenuta sui mesi futuri, introducendo una previsione implicita
 * dove oggi non ce n'e' nessuna.
 *
 * Puro: sta qui e non nel resolver proprio per essere testabile (il resolver non ha test).
 */
export function computeRalTeoricoAnnuo(
  nominaliMesiTrascorsi: number[],
  nominaleCorrente: number,
  mensilita: number,
): number {
  const trascorsi = nominaliMesiTrascorsi.reduce((acc, n) => acc + n, 0)
  const mesiFuturi = Math.max(0, 12 - nominaliMesiTrascorsi.length)
  const mensilitaAggiuntive = Math.max(0, mensilita - 12)
  return r2(trascorsi + (mesiFuturi + mensilitaAggiuntive) * nominaleCorrente)
}

export function stimaConguaglio(input: StimaConguaglioInput): StimaConguaglioOutput {
  const {
    scaglioni, imponibiliMensiliReali, imponibiliNominaliMensili,
    ralTeoricoImponibile, mesiAttesiReali, mesiFuturi, proiezione,
  } = input

  if (imponibiliNominaliMensili.length !== imponibiliMensiliReali.length) {
    throw new Error(
      `stimaConguaglio: nominali (${imponibiliNominaliMensili.length}) e reali ` +
      `(${imponibiliMensiliReali.length}) devono avere la stessa lunghezza — sono mese per mese.`,
    )
  }

  // extra_m confronta ogni mese col SUO nominale: decorrenza e aliquota di quel mese.
  const extraReale = imponibiliMensiliReali.map((m, i) => r2(m - (imponibiliNominaliMensili[i] ?? 0)))
  const sommaExtraReale = r2(extraReale.reduce((acc, e) => acc + e, 0))

  const mesiCompletiUsati = imponibiliMensiliReali.length
  const extraProiettatoPerMese = proiezione === 'storico' && mesiCompletiUsati > 0
    ? sommaExtraReale / mesiCompletiUsati
    : 0

  const deltaImponibileAnnuo = r2(sommaExtraReale + mesiFuturi * extraProiettatoPerMese)

  const ralEffettivoImponibile = r2(ralTeoricoImponibile + deltaImponibileAnnuo)

  // marginali: non entrano più nel calcolo, restano esposti perché la card li mostra come
  // contesto ("sei passato dal 23% al 33%").
  const marginaleTeorico = marginalRate(ralTeoricoImponibile, scaglioni)
  const marginaleEffettivo = marginalRate(ralEffettivoImponibile, scaglioni)

  const aliquotaMediaLorda = ralTeoricoImponibile > 0
    ? computeIrpefLorda(ralTeoricoImponibile, scaglioni) / ralTeoricoImponibile
    : 0
  const conguaglioStimato = r2(
    computeIrpefLorda(ralEffettivoImponibile, scaglioni) - aliquotaMediaLorda * ralEffettivoImponibile,
  )

  return {
    mesiCompletiUsati,
    mesiAttesiReali,
    ralTeoricoImponibile,
    ralEffettivoImponibile,
    deltaImponibileAnnuo,
    marginaleTeorico,
    marginaleEffettivo,
    conguaglioStimato,
    warningConguaglio: Math.abs(conguaglioStimato) > 200,
  }
}
