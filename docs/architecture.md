# Architettura v1

```text
Utente → DANIEL (intento, priorità, routing) → Domain Agent → Project/Specialist
                     ↑                                ↓
          Global registry e memoria             DAP result/handoff
```

## Responsabilità

| Livello | Fa | Non fa |
|---|---|---|
| DANIEL | routing, sintesi trasversale, priorità, promotion della memoria | esecuzioni specialistiche o azioni esterne non approvate |
| Domain agent | ragiona nel dominio, delega, conserva la memoria di dominio | modifica conoscenza globale |
| Project agent | applica il contesto di un progetto | decide strategia cross-domain |
| Specialist | esegue un task circoscritto | conserva memoria permanente in autonomia |

## Monorepo

```text
apps/                 entry point e interfacce, senza logica agent-specifica
packages/             DAP, runtime, adapter e componenti condivisi
agents/<agent-id>/    definizione e workflow di un singolo agente
projects/<project-id>/ contesto persistente di progetto
registry/             directory e mapping tra entità
```

Un agente dipende da contratti condivisi, ma non da cartelle private di un altro agente. La collaborazione passa tramite DAP e riferimenti di contesto.

## Registri iniziali

I file in `registry/` sono il control plane locale. Hanno identificatori stabili, ownership e stato. Il contenuto operativo dei progetti resta in `projects/<id>/`.

## Memoria

- `global`: identità, preferenze, principi e priorità confermate.
- `domain`: convenzioni e conoscenza riusabile di un dominio.
- `project`: decisioni, contesto e attività di un progetto.
- `session`: contesto temporaneo; mai promosso automaticamente.

Ogni scrittura in memoria è una proposta DAP (`memory_updates`) con owner, scope, evidenza e motivazione.
