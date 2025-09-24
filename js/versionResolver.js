/**
 * versionResolver.js
 * -------------------------------------------------------------
 * Formål:
 *  Finne hvilken versjon som er gjeldende for en gitt reisedato
 *  (travelDate) på kjøpstidspunktet (purchaseDate).
 *
 * Datastruktur antatt (samme som i eksisterende chartData):
 *  {
 *    version: string,            // f.eks. "v1.0"
 *    publishDate: number,        // tidspunkt (ms) versjon ble tilgjengelig
 *    open: number,               // start på gyldighetsperiode (ms)
 *    close: number,              // slutt på gyldighetsperiode (ms) (eksklusiv eller inklusiv – se note under)
 *    ... (andre felt ignorert av denne modulen)
 *  }
 *
 * Regler:
 *  1. Tilgjengelige versjoner ved kjøpstidspunkt: alle hvor publishDate <= purchaseDate.
 *  2. En versjon dekker reisedato hvis open <= travelDate <= close (vi antar close inklusiv).
 *     - Hvis du ønsker eksklusiv slutt kan du sette option { inclusiveEnd: false }.
 *  3. Hvis flere tilgjengelige versjoner dekker reisedato velges den med høyest publishDate
 *     (altså den nyeste publiserte som allerede er gyldig for reisen).
 *  4. Hvis ingen tilgjengelige versjoner dekker reisedato returneres null med reason.
 *  5. Hvis ingen versjoner i det hele tatt er publisert ennå (purchaseDate før første publishDate), returneres null med reason.
 *
 * Returnverdi:
 *  {
 *    match: object | null,   // Den valgte versjons-objektet eller null
 *    reason: string,         // Forklaring hvis match == null, ellers 'OK'
 *    candidates: object[],   // Versjoner som var både tilgjengelige og dekket reisedato
 *    available: object[],    // Alle versjoner som var tilgjengelige på purchaseDate
 *    purchaseDate: number,
 *    travelDate: number,
 *    options: { inclusiveEnd: boolean }
 *  }
 *
 * Edge cases håndteres eksplisitt i reason:
 *  - 'NO_AVAILABLE_VERSIONS'
 *  - 'NO_VERSION_COVERS_TRAVEL_DATE'
 *  - 'OK'
 */

/**
 * @typedef {Object} ResolveOptions
 * @property {boolean} [inclusiveEnd=true] - Om slutt (close) skal behandles inklusivt.
 */

/**
 * Finn riktig versjon gitt purchaseDate og travelDate.
 * @param {Array<Object>} versions - Array av versjonsobjekter.
 * @param {number|Date} purchaseDate - Kjøpstidspunkt (ms eller Date).
 * @param {number|Date} travelDate - Reisetidspunkt (ms eller Date).
 * @param {ResolveOptions} [options] - Valg.
 * @returns {Object} result
 */
export function resolveVersion(versions, purchaseDate, travelDate, options = {}) {
  const { inclusiveEnd = true } = options;
  const p = purchaseDate instanceof Date ? purchaseDate.getTime() : purchaseDate;
  const t = travelDate instanceof Date ? travelDate.getTime() : travelDate;

  if (!Array.isArray(versions) || versions.length === 0) {
    return baseResult(null, [], [], [], p, t, options, 'NO_AVAILABLE_VERSIONS', buildExplanation(null, [], [], [], p, t, 'NO_AVAILABLE_VERSIONS', inclusiveEnd));
  }

  // Alle versjoner sortert etter publishDate (stigende) – ikke påkrevd men nyttig for determinisme.
  const sorted = [...versions].sort((a, b) => a.publishDate - b.publishDate);

  // Filtrer tilgjengelige ved purchaseDate
  const available = sorted.filter(v => v.publishDate <= p);

  // inRange helper
  const inRange = (v) => inclusiveEnd ? (v.open <= t && t <= v.close) : (v.open <= t && t < v.close);
  const futureCovering = sorted.filter(v => v.publishDate > p && inRange(v));
  if (available.length === 0) {
    return baseResult(null, [], available, futureCovering, p, t, options, 'NO_AVAILABLE_VERSIONS', buildExplanation(null, [], available, futureCovering, p, t, 'NO_AVAILABLE_VERSIONS', inclusiveEnd));
  }

  // Gyldighetsfunksjon
  const candidates = available.filter(inRange);
  if (candidates.length === 0) {
    return baseResult(null, candidates, available, futureCovering, p, t, options, 'NO_VERSION_COVERS_TRAVEL_DATE', buildExplanation(null, candidates, available, futureCovering, p, t, 'NO_VERSION_COVERS_TRAVEL_DATE', inclusiveEnd));
  }

  // Velg nyeste (høyeste publishDate). Hvis tie, velg den med senest open (fallback).
  let match = candidates.reduce((acc, cur) => {
    if (!acc) return cur;
    if (cur.publishDate > acc.publishDate) return cur;
    if (cur.publishDate === acc.publishDate && cur.open > acc.open) return cur;
    return acc;
  }, null);

  return baseResult(match, candidates, available, futureCovering, p, t, options, 'OK', buildExplanation(match, candidates, available, futureCovering, p, t, 'OK', inclusiveEnd));
}

function baseResult(match, candidates, available, futureCovering, purchaseDate, travelDate, options, reason, explanation) {
  return {
    match,
    reason,
    candidates,
    available,
    futureCovering,
    purchaseDate,
    travelDate,
    options: { inclusiveEnd: options.inclusiveEnd !== false },
    explanation
  };
}

function fmt(d) { return new Date(d).toLocaleDateString(); }

function buildExplanation(match, candidates, available, futureCovering, purchaseDate, travelDate, reason, inclusiveEnd) {
  const pStr = fmt(purchaseDate);
  const tStr = fmt(travelDate);
  const endWord = inclusiveEnd ? 'inkludert' : 'eksklusiv';
  if (reason === 'NO_AVAILABLE_VERSIONS') {
    return `Ingen versjoner var publisert på kjøpsdato ${pStr}. Første publisering er senere enn kjøpsdato.`;
  }
  if (reason === 'NO_VERSION_COVERS_TRAVEL_DATE') {
    let base = `Det fantes ${available.length} publiserte versjon(er) på kjøpsdato ${pStr}, men ingen hadde en gyldighetsperiode som dekker reisedato ${tStr}. (Sluttdato er ${endWord}).`;
    if (futureCovering.length > 0) {
      const f = futureCovering[futureCovering.length - 1];
      base += ` En nyere versjon (${f.version}, publisert ${fmt(f.publishDate)}) ville ha dekket reisedatoen men var ikke tilgjengelig ved kjøp.`;
    }
    return base;
  }
  if (reason === 'OK' && match) {
    const pub = fmt(match.publishDate);
    const open = fmt(match.open);
    const close = fmt(match.close);
    let expl = `${match.version} fordi den var publisert (${pub} er før kjøpsdato ${pStr}) og reisedato ${tStr} ligger innenfor gyldighetsperioden ${open} – ${close} (${endWord} slutt).`;
    if (candidates.length > 1) {
      expl += ` Det fantes ${candidates.length - 1} annen/andre eldre kandidat(er) som også dekket reisedatoen, men ${match.version} er nyere (senere publishDate).`;
    }
    if (futureCovering.length > 0) {
      const latestFuture = futureCovering[futureCovering.length - 1];
      expl += ` En senere versjon (${latestFuture.version}, publisert ${fmt(latestFuture.publishDate)}) ville også dekke reisedatoen men var ikke publisert på kjøpsdato.`;
    }
    return expl;
  }
  return '';
}

/**
 * Hjelpefunksjon for enkel bruk – returnerer bare versjonsnavn eller null.
 */
export function resolveVersionName(versions, purchaseDate, travelDate, options) {
  const r = resolveVersion(versions, purchaseDate, travelDate, options);
  return r.match ? r.match.version : null;
}
