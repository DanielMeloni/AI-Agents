# Nota tecnica — override `rollup: 4.64.0`

Stato: attivo · Introdotto in: `3f31f15` · Dichiarato in: `pnpm-workspace.yaml` (`overrides`)

## Motivo

`vite` (dipendenza di `vitest`) richiede `rollup`, che a sua volta richiede 25 pacchetti di piattaforma `@rollup/rollup-*` alla stessa versione esatta. Il lockfile originale fissava `rollup@4.64.2` e le sue 25 varianti (26 voci), pubblicate il 2026-10-07 alle 17:42–17:43 UTC, poche ore prima della generazione del lockfile. Erano quindi più recenti della minimum release age e `pnpm test` veniva bloccato dalla supply-chain policy.

Con la policy attiva pnpm sceglieva comunque `rollup@4.64.2` per il pacchetto principale, poi non trovava le varianti di piattaforma abbastanza vecchie e l'installazione falliva (`ERR_PNPM_NO_MATURE_MATCHING_VERSION`). L'override fissa `rollup` a `4.64.0` (pubblicata il 2026-10-02), una versione che rispetta la policy.

Nel lockfile è cambiato solo rollup: 26 voci da `4.64.2` a `4.64.0`. Nessun'altra dipendenza è stata modificata.

## Policy che lo richiede

Minimum release age (`minimumReleaseAge`): pnpm rifiuta versioni pubblicate da meno del tempo configurato.

- Il valore non è definito in questo repository: viene dalla configurazione dell'ambiente in cui girano i test.
- Per rigenerare il lockfile è stato assunto 1 giorno (1440 minuti), dedotto dal fatto che il pacchetto più recente fuori da rollup (`vite@7.3.7`) aveva 1,6 giorni e risultava accettato. **Questo valore è una deduzione e va confermato.**
- La policy non è stata disattivata e non è stato usato `minimumReleaseAgeExclude`.

## Criterio di rimozione

Rimuovere l'override solo quando una versione più recente di Rollup supera la soglia della policy:

1. Controllare la data di pubblicazione: `npm view rollup time --json`.
2. Una versione è candidata solo se `rollup` **e** tutte le sue varianti `@rollup/rollup-*` hanno un'età maggiore della soglia (le varianti vengono pubblicate qualche secondo prima del pacchetto principale).
3. Se nessuna versione successiva a `4.64.0` supera la soglia, l'override resta.
4. Non usare `minimumReleaseAgeExclude`, né abbassare o disattivare la policy, per rimuovere l'override.

## Verifica prima della rimozione

Dopo aver tolto la sezione `overrides` da `pnpm-workspace.yaml` e rigenerato il lockfile con la policy attiva, eseguire:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm demo "Proponi un articolo su Dataform per il mio blog"
```

Rimuovere l'override solo se `pnpm install` risolve senza errori di maturità e i tre comandi passano. Controllare poi `git diff pnpm-lock.yaml`: devono cambiare solo le voci di rollup. Se `pnpm install` fallisce con `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, ripristinare l'override.
