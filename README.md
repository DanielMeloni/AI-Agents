# DANIEL AI OS — monorepo

Un unico repository Git per il codice, le configurazioni, i workflow e i contratti di tutti gli agenti. BLACKSTAR è il primo verticale implementato; DANIEL e gli altri agenti usano gli stessi componenti condivisi.

## Principi v1

- **DANIEL orchestra:** classifica, pianifica e coordina; non esegue attività fuori dal proprio perimetro.
- **Un contratto comune:** tutti gli agenti usano DAP (`docs/dap.md`) e manifest YAML.
- **Dati minimi:** i registri locali sono la fonte iniziale; nessun database o servizio esterno è necessario per iniziare.
- **Permessi espliciti:** lettura, scrittura ed esecuzione sono separati. Le azioni esterne restano in approvazione fino a una policy deliberata.
- **Memoria promossa, non accumulata:** una sessione genera candidate memory; DANIEL decide se promuoverla.

## Struttura

```text
agents/       un modulo autonomo per ogni agente
apps/          future applicazioni: dashboard, API, worker
packages/      contratti e runtime condivisi
projects/     metadati e memoria dei singoli progetti
registry/     indice di agenti, progetti e fonti dati
templates/    base per nuovi agenti e progetti
docs/         architettura, protocollo e policy
```

Ogni `agents/<id>/` contiene configurazione, istruzioni, workflow e memoria di dominio. Il codice riusabile non viene duplicato negli agenti: vivrà in `packages/`.

## Primo ciclo operativo

1. Registra un progetto in `registry/projects.yaml`.
2. Descrivi fonti e permessi, inizialmente solo `read`.
3. DANIEL produce un routing plan DAP.
4. L'agente di dominio restituisce un risultato strutturato e, se serve, un handoff.
5. Una sola decisione confermata viene promossa in memoria/decisioni del progetto.

## MVP locale BLACKSTAR

Stack: TypeScript + pnpm workspace (workspaces: `packages/*`, `agents/*`, `apps/*`). Nessuna rete, database, LLM o credenziali: tutto gira in **dry-run locale**.

```text
packages/contracts   tipi + validazione runtime (zod) di DAP Request/Result/Handoff, manifest e policy
packages/runtime     loader manifest YAML, router, policy guard, esecutore generico di workflow
agents/blackstar/src step del workflow blackstar-editorial-intake (logica di dominio)
apps/cli             CLI: testo → DAP Result JSON
```

Requisiti: Node.js ≥ 20 e pnpm ≥ 10 (`corepack enable` oppure `npm i -g pnpm`).

```bash
pnpm install                                  # installa le dipendenze
pnpm test                                     # esegue i test (vitest)
pnpm typecheck                                # controllo tipi (tsc --noEmit)
pnpm demo "Proponi un articolo su Dataform per il mio blog"
```

La demo stampa un DAP Result JSON su stdout. Exit code: `0` per `completed`/`needs_input`/`handed_off`, `2` per `blocked`/`failed`, `1` per errori d'uso.

Altri esempi:

```bash
pnpm demo "Pubblica l'articolo su Dataform sul blog"                   # status: blocked (serve conferma)
pnpm demo "Pubblica l'articolo su Dataform sul blog" --confirm publish # conferma ricevuta, ma nessun connettore: nulla viene eseguito
pnpm demo "Proponi un articolo per il mio blog"                        # status: needs_input (manca l'argomento)
```

Opzioni CLI: `--confirm <azione>` (ripetibile; `publish`, `external_write`, `delete`, `editorial_plan_change`), `--project <id>`, `--root <path>`.

Note di design:

- `publish`, `external_write`, `delete` ed `editorial_plan_change` sono sempre bloccati senza conferma esplicita; i manifest possono solo aggiungere azioni protette. La conferma è un parametro del runtime, non un campo DAP.
- Il rilevamento dell'azione richiesta è euristico e prudente (parole chiave IT/EN): preferisce un falso blocco a un'azione non confermata.
- Il router è generico: legge `routing.keywords` (campo opzionale) da `agents/<id>/agent.yaml`; un `*` finale indica un prefisso (`articol*`).
- Il codice dei pacchetti è consumato direttamente come TypeScript (nessuno step di build) tramite `tsx` e `vitest`.

## BLACKSTAR Desktop (Windows, locale)

App desktop Electron + TypeScript in `apps/desktop`: una finestra nativa con la mascotte BLACKSTAR. Il click apre/chiude la conversazione, che invia le richieste al runtime DAP locale. Nessun server HTTP, nessuna app web, nessuna rete.

Requisiti: Windows 10/11, Node.js ≥ 22.12, pnpm ≥ 10. Al **primo avvio** Electron scarica il proprio binario (serve una connessione una tantum; poi l'app funziona offline).

```bash
pnpm install
pnpm desktop:dev     # compila (esbuild) e apre la finestra
pnpm test            # include i test dell'app desktop
```

Uso: clicca la mascotte, premi «Richiesta demo» (oppure scrivi) e invia. Il risultato mostra stato, summary, proposta, outline e azioni richieste. Se una richiesta è bloccata compare il pulsante «Conferma …»: la conferma vale solo per quella richiesta.

Struttura e sicurezza:

- Il processo main importa direttamente `@daniel-ai-os/{contracts,runtime,blackstar}`; la UI (renderer) non ha accesso a filesystem, YAML, Node.js o Electron.
- Il preload espone una sola API: `window.blackstar.chat(message, options)` → un solo canale IPC (`blackstar:chat`). Payload e risposta sono validati con zod su entrambi i lati del main; il mittente deve essere la pagina locale.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; permessi del browser negati, navigazione e nuove finestre bloccate, richieste http(s)/ws annullate, CSP restrittiva.
- Mascotte in SVG/CSS originale con stati `idle`, `listening`, `working`, `responding`, `blocked`.

Limiti dell'MVP: sempre dry-run (anche con conferma non viene eseguita alcuna azione: nessun connettore, WordPress, Drive, database o LLM); nessuna persistenza della conversazione; nessun installer/pacchetto (si avvia dal repository con `pnpm desktop:dev`); la proposta editoriale viene da un template locale; il repository deve restare sul disco perché i manifest YAML sono letti da `agents/`.

Vedi [architettura](docs/architecture.md), [DAP](docs/dap.md), [BLACKSTAR](agents/blackstar/README.md) e [roadmap](docs/roadmap.md).
