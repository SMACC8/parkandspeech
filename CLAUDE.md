# Park&Speech — contesto progetto

App per l'analisi e l'esercizio della voce, sviluppata per una logopedista che
segue pazienti con **malattia di Parkinson** (disartria ipocinetica).
Autore: Sergio Moro. Non è un dispositivo medico diagnostico: è uno strumento di
monitoraggio ed esercizio.

## Due app, due repository

| App | Repository | Indirizzo | Destinatario |
|---|---|---|---|
| Clinica | `parkandspeech` | https://smacc8.github.io/parkandspeech/ | logopedista |
| Esercizi | `parkandspeechpat` | https://smacc8.github.io/parkandspeechpat/ | paziente, in autonomia |

Entrambe: **PWA vanilla**, un unico `index.html` autosufficiente (HTML+CSS+JS
inline, nessun framework, nessun build), più `sw.js`, `manifest.json`,
`icon-192.png`, `icon-512.png` nella radice del repo. Pubblicate con GitHub Pages
(branch `main`, root).

Le due app condividono lo stesso "motore" audio duplicato nei due file:
**ogni modifica al motore va riportata su entrambi.**

## Differenze fra le due

**Clinica**: menu con Test singolo · Test in serie · Cronometro · Storico ·
Dettato · QR paziente · Impostazioni e info. Storico su `localStorage`, export
CSV, invio via email, anagrafica paziente chiesta **al salvataggio** (non prima).

**Paziente**: solo 3 esercizi (Intensità massima, Forte e lungo, Cambio di tono)
+ Cronometro + Dettato + check distanza. **Niente storico, niente salvataggi,
niente impostazioni.** Esclusa "Normale e lungo" perché puramente valutativa.

## I test

1. **Intensità massima** — voce fortissima, anche liste di parole (contare 1-10).
   Registrazione **continua**.
2. **Forte e lungo** — /a/ forte tenuta in un fiato. MPT, intensità, tenuta.
3. **Normale e lungo (MPT)** — solo app clinica.
4. **Cambio di tono** — il paziente deve **mantenere** la voce dentro fasce di
   frequenza per un tempo dato. Fasce configurabili (fino a 5, con colore
   verde/azzurro/rosa), grafico alto con scala Y adattiva al min/max impostato.

Metriche: MPT, intensità media/picco, trend di intensità (regressione lineare
→ "calante" è il decay tipico del Parkinson), F0 e sua deviazione standard,
jitter/shimmer/HNR (stime frame-level, non ciclo-per-ciclo come Praat: valide
come trend, non come valori clinici assoluti).

## Vincoli tecnici — NON REGREDIRE SU QUESTI

Sono tutti nati da bug reali costati settimane. Prima di toccarli, capire perché ci sono.

1. **AGC off.** `getUserMedia` con `autoGainControl:false, echoCancellation:false,
   noiseSuppression:false`. Senza, qualsiasi misura di intensità è inutilizzabile.

2. **Rilascio del microfono (`releaseMic`).** Lo stream audio va **chiuso** prima
   di avviare il riconoscimento vocale: su Android il microfono non si condivide.
   Tenerlo aperto causava: dettatura che non parte, che funziona solo con la bocca
   attaccata al telefono, e che ripete le prime parole. È stato il bug più grave.

3. **Registrazione continua** su "Intensità massima" e "Cambio di tono"
   (`CUR_CONT`): non si ferma alle pause e prosegue **finché l'utente preme
   "Ferma ora"** (tetto di sicurezza 5 min). Serve per liste di parole e vocalizzi
   in serie. Non reintrodurre timer che la interrompono.

4. **Rilevamento del tono permissivo.** Soglie basse (rms 0.0025, clarity 0.30) e
   linea che "scavalca" i buchi brevi. Scelta deliberata: per l'esercizio conta la
   fluidità del tracciato più della precisione. L'analisi pass/fail delle fasce
   resta invece filtrata.

5. **Dettato Android-safe.** Su Android: `continuous=false` (lì è mal supportato e
   ri-emette i risultati), risultati **indicizzati** (`finals[i]=...`, una
   ri-emissione sovrascrive invece di duplicare), riavvio ritardato, e
   de-duplicazione per sovrapposizione che ignora punteggiatura e maiuscole.

6. **Intensità mostrata come "Livello 0–100"**, non dB SPL. È derivata dal dBFS.
   La logopedista si aspettava 65/75 dB: i dBFS grezzi **non sono confrontabili**.
   Dal 18/09/2026 esiste la **calibrazione SPL a un punto** (app clinica): con un
   fonometro di riferimento si registra `off = SPL_rif − dBFS_misurati` e si può
   scegliere la visualizzazione "dB SPL" (= dBFS + off). Senza calibrazione quel
   modo resta disattivato. L'offset viene **congelato nella sessione** (`calOff`)
   al momento della registrazione: ricalibrare non falsa lo storico. Nel CSV restano i dBFS reali.

7. **CSV per Excel italiano**: separatore `;`, virgola decimale, BOM UTF-8, CRLF.
   Le colonne SPL (`meanSpl_db`, `peakSpl_db`, `cal_offset_db`) sono **in coda**:
   l'ordine delle colonne storiche non va cambiato, chi ha già fogli Excel li romperebbe.

8. **Service worker network-first**, con versione cache da incrementare ad ogni
   rilascio (`voce-vN` e `voce-paz-vN`), altrimenti i telefoni servono la versione
   vecchia. Se una PWA è già installata, spesso serve disinstallare + hard refresh.

## Impostazioni (solo app clinica)

Temi (5), visualizzazione dB/Livello, orientamento comandi (paziente / medico
capovolto), soglie di avvio voce normale e forte **legate fra loro** (la normale
non può superare la forte), gestore stanze (il nome stanza finisce nel CSV; utile
per tracciare anche il setup, es. "Studio 1 · VM10"), **calibrazione dB SPL**
(procedura guidata: media di energia su 3 s, blocco della misura, inserimento del
valore del fonometro; offset accettato solo fra 30 e 160 dB), schema del Cambio di tono,
schema del Test in serie (attivazione, ordine, ripetizioni), email del medico,
cancella cronologia (doppia conferma).

## Preferenze dell'autore

Risposte brevi e diritte, franche anche quando critiche. Sergio **non è un
programmatore**: spiegare codice e informatica in modo semplice ma corretto.
Chiedere prima di scelte importanti; sulle cose di routine procedere.
Testa su Mac desktop, Android (telefono e tablet), laptop Linux Mint; va comunque
verificata la compatibilità iOS.

## Aperto / da fare

- **Verifica sul campo della calibrazione SPL**: fatta a un punto, quindi assume
  linearità del microfono su tutto il range; da controllare con la logopedista se
  i valori reggono anche a voce fortissima (rischio compressione/clipping).
  Da valutare se serve una calibrazione **per stanza** invece che unica.
- Valutare se il Dettato regge sul campo; l'alternativa affidabile sarebbe una STT
  cloud (a pagamento) o un'app nativa con riconoscimento Android nativo.
- Eventuale guida fase-per-fase in tempo reale nel Cambio di tono (oggi la
  valutazione è a posteriori su tutta la registrazione).

## Storia dei feedback clinici (sintesi)

La logopedista usa l'app in ambulatorio. Ha chiesto e ottenuto: registrazione che
non si ferma alle pause, grafico del tono più facile da tracciare (confronto con
"Voice Tools"), rimozione di "Normale e lungo" dalla versione paziente, e il
Dettato (ispirato a Voice Notebook). Ha segnalato il problema dei permessi
microfono: il permesso va dato **al browser per quel sito**, non all'app Google —
ora le istruzioni sono dentro l'app.
