# DAP — Daniel Agent Protocol v1.0

DAP è il formato logico per task, risultati e handoff. È intenzionalmente piccolo per contenere il contesto passato tra agenti.

## Request

```yaml
request_id: req_...
type: task # task | routing | review | handoff
user_request: ""
source_agent: DANIEL
target_agent: BLACKSTAR
project_id: null
priority: normal # low | normal | high | urgent
context_refs: [] # riferimenti, non copie di documenti
constraints: []
requested_action: ""
```

## Result

```yaml
request_id: req_...
status: completed # completed | needs_input | blocked | handed_off | failed
summary: ""
facts: []
assumptions: []
decisions: []
actions_completed: []
actions_required: []
blockers: []
artifacts: []
memory_updates: []
handoff: null
```

## Handoff

```yaml
target_agent: DEV
reason: "Implementazione WordPress necessaria"
project_id: personal-blog
context_refs: []
requested_action: ""
```

## Regole

1. Passa solo il contesto necessario e riferimenti risolvibili.
2. Distingui sempre fatti, assunzioni e decisioni.
3. Un agente senza permesso risponde `needs_input` o `handed_off`, senza aggirare il controllo.
4. `memory_updates` sono proposte: DANIEL le valida prima della promozione.
