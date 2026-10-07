# Shared packages

Qui vivranno solo componenti riusabili da almeno due agenti:

- `contracts`: tipi e validazione DAP;
- `runtime`: routing, context assembly e policy enforcement;
- `connectors`: adapter approvati per fonti esterne.

Un componente specifico di BLACKSTAR resta in `agents/blackstar/` finché non dimostra di essere riusabile.
