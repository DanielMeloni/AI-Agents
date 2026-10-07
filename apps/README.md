# Applications

Questa cartella ospiterà i punti di ingresso del sistema, non la logica dei singoli agenti.

Possibili applicazioni future:

- `web`: chat e dashboard di DANIEL;
- `api`: endpoint per routing e autorizzazioni;
- `worker`: esecuzioni pianificate e code.

Stato MVP: esiste solo `cli` (demo locale in dry-run, nessuna logica agent-specifica oltre al wiring). `web`, `api` e `worker` restano da creare dopo la validazione del pilot.
