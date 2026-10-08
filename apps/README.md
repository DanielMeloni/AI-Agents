# Applications

Questa cartella ospiterà i punti di ingresso del sistema, non la logica dei singoli agenti.

Possibili applicazioni future:

- `web`: chat e dashboard di DANIEL;
- `api`: endpoint per routing e autorizzazioni;
- `worker`: esecuzioni pianificate e code.

Stato MVP: esistono `cli` (demo locale in dry-run) e `desktop` (BLACKSTAR Desktop, Electron). Entrambe contengono solo wiring, nessuna logica agent-specifica. Non sono previsti `web` né `api`; `worker` resta da valutare dopo il pilot.
