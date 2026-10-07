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

Vedi [architettura](docs/architecture.md), [DAP](docs/dap.md), [BLACKSTAR](agents/blackstar/README.md) e [roadmap](docs/roadmap.md).
