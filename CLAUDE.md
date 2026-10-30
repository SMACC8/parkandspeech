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

**Clinica**: Test singolo (solo 3, in quest'ordine: Forte e lungo · Cambio di tono ·
Intensità massima — "Normale e lungo" tolta su richiesta, la misura col cronometro;
tolta anche dal Test in serie, `SERIE_IDS`; resta solo per leggere lo storico vecchio)
· Test in serie · Cronometro · Storico ·
Dettato · QR paziente (con **foglio A4 stampabile** per il paziente: QR di
installazione, permesso microfono, posizione del telefono; `#printSheet`, visibile
solo in stampa) · Impostazioni e info. Storico su `localStorage`, export
CSV, invio via email, anagrafica paziente chiesta **al salvataggio** (non prima).

**Paziente**: 3 esercizi (Intensità massima, Forte e lungo, Cambio di tono)
+ **Esercizi in serie** + Cronometro + Dettato + check distanza. **Niente storico, niente
salvataggi, niente impostazioni**, con due eccezioni volute: l'area del clinico
(pressione lunga sul logo: calibrazione, linea obiettivo, ripetizioni e livello degli Esercizi in serie) e gli
**ultimi 20 risultati degli Esercizi in serie** (`voce_lsvt_ultimi`), per confrontare le
frequenze nel tempo. Esclusa "Normale e lungo" perché puramente valutativa.

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

8. **Aiuto microfono (`vMic`, `openMicHelp`)**, in entrambe le app. La PWA
   installata gira dentro il browser: in Android il microfono **non compare** fra le
   autorizzazioni dell'app (si vedono solo le Notifiche) — è un permesso di Chrome
   per il sito. Quando `getUserMedia` fallisce, l'app spiega il perché (negato /
   occupato / assente) con i passi giusti per Android, iOS o computer; avviso rosso
   nel menu se il permesso risulta già negato. Non tornare al semplice toast.

9. **Griglia del volume nel grafico live** (`volTicks`, `volScale`), in entrambe le
   app, sui test di intensità (non nel Cambio di tono, che ha la sua scala in Hz).
   Righe con valori in dB SPL se calibrato, altrimenti dB o Livello; massimo ~7
   righe. Il canvas è stirato dal CSS: le etichette compensano con `scale(1/sx,1/sy)`.
   La linea rossa del tono resta nel grafico live (tolta e poi **rimessa su
   richiesta**: la logopedista usa la sua instabilità dopo qualche secondo come
   feedback per lo sforzo). Ha la sua scala 60–400 Hz, non va letta sulla griglia. `volScale` è
   l'unico pezzo diverso fra le app: la clinica ha calibrazione a offset, l'app
   paziente a due punti (`spl = a·dBFS + b`).

   **Linea obiettivo** (`SET.goal = {on, unit, v}`, `goalLv`, `drawGoal`): **solo
   su Forte e lungo** (richiesta della logopedista; valori tipici 60–80 dB, diversi
   per paziente). Riga verde a un valore scelto dal clinico; il tracciato sopra la riga diventa verde e
   compare "✓ obiettivo". Il valore vale **solo nell'unità in cui è stato impostato**
   (dB SPL / dB / Livello): se cambiano calibrazione o visualizzazione la riga
   sparisce e va reimpostata, per non indicare un livello sbagliato. Si imposta:
   clinica → Impostazioni; app paziente → pressione lunga sul logo (area clinico,
   insieme alla calibrazione). Spenta di default.

10. **Service worker network-first**, con versione cache da incrementare ad ogni
   rilascio (`voce-vN` e `voce-paz-vN`), altrimenti i telefoni servono la versione
   vecchia. Se una PWA è già installata, spesso serve disinstallare + hard refresh.

## Esercizi in serie (ex "Serie LSVT"; entrambe le app, modulo identico salvo `LS_REMEMBER`)

**Nell'interfaccia non si scrive "LSVT"**: è un marchio registrato (LSVT Global), segnalato
dalla logopedista il 30/10/2026. Resta solo la citazione scientifica in Info (Ramig et al.).
Nel codice il prefisso `ls…` e la chiave `voce_lsvt_ultimi` restano (non visibili).

Esercizio quotidiano LSVT LOUD, richiesto dalla logopedista: N Forte e lungo → N
acuti → N gravi, **non alternati**; N regolabile 1–15 (`SET.lsvt.reps`, default 15,
"si sale pian piano a 45 al giorno"). Si avvia una volta e va da sola: **3 s di
pausa** tra i vocalizzi, 5 s prima di ogni blocco. Ogni vocalizzo si chiude quando la
voce si ferma (non è registrazione continua: il vincolo 3 non c'entra).
- Forte e lungo: **vale anche se corto** (minimo 1 s, per scartare tosse/rumori); sullo
  schermo i secondi salgono verso l'**obiettivo di 10 s** (stimolo, non esame: correzione
  della logopedista, i 5 s valgono solo per acuti/gravi). Nel riepilogo: quanti arrivati a 10 s.
  C'è la linea obiettivo.
- Acuti/gravi: **nessuna soglia in Hz** (scelta della logopedista: conta che si veda
  il cambio). Tono di partenza = mediana dei primi 0,5 s; cambio = ≥ N semitoni nella
  direzione giusta per 0,2 s, con N = **livello** regolabile (`SET.lsvt.st`: Facile 1 ·
  Medio 2 · Difficile 3; default Facile, dopo che 2 risultava faticoso già a Sergio); vale se tenuto **5 s dal cambio**. Grafico del tono su
  scala logaritmica con riga di partenza e soglia.
- Se non vale, **si ripete lo stesso vocalizzo**. I 5 s si contano sull'ultimo istante
  con voce (`tv`), non sul tempo trascorso: un'app ferma un attimo non regala secondi.
- Riepilogo: durata media/massima, acuto più alto, grave più basso (mediana del tono
  nei 5 s tenuti). Nello storico clinico **non** si salva (lì va solo la valutazione).
- Wake Lock dello schermo durante la serie (dura minuti senza tocchi).

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

- **Esercizi in serie: verifica sul campo** (fatta il 26/10/2026, provata solo con voce
  simulata). Da controllare con pazienti veri soprattutto la soglia del cambio di
  tono (livello `SET.lsvt.st`, default Facile = 1 semitono: a 1 semitono il rischio è che basti
  un'oscillazione naturale della voce) e gli errori d'ottava del rilevatore di tono.
- La logopedista **non ha un fonometro**: la calibrazione SPL per ora non si usa.
- **Doppione "Test in serie" / "Esercizi in serie"** nell'app clinica: la logopedista propone
  di tenerne uno solo. In attesa di sapere se usa il Test in serie per la valutazione (salva
  nello storico); se sì, va tenuto e rinominato "Valutazione in serie".

## Storia dei feedback clinici (sintesi)

La logopedista usa l'app in ambulatorio. Ha chiesto e ottenuto: registrazione che
non si ferma alle pause, grafico del tono più facile da tracciare (confronto con
"Voice Tools"), rimozione di "Normale e lungo" dalla versione paziente, e il
Dettato (ispirato a Voice Notebook). Ha segnalato il problema dei permessi
microfono: il permesso va dato **al browser per quel sito**, non all'app Google —
ora le istruzioni sono dentro l'app.
