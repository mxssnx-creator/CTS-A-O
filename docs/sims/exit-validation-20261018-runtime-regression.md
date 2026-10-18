# Completed-flat-bar runtime replay regression

The latest source-bound replay used the unchanged sealed 794-config, four-symbol, 168-hour prehistory plus 24-hour trading protocol. It deep-matched the preceding economic output across every settled trade, open mark, configuration/step evaluation, hourly/family return and rejection diagnostic.

- Canonical economic SHA-256: `cebdce48a2ca9c9876c014485ac4630118f34468693bd35ef18caf1e83ad08c3`.
- Frozen protocol SHA-256: `f31b21388edbbb586e4efa341dc1cce2fd4262d536c7677c59b1ef8de7bcd7b5`.
- Final runtime source SHA-256: `93a0c1a3c68d090ccfb6c7c9c07ce4515d4de0a4be9099dca28d230c65a6adb7`; the Exit source is unchanged.
- Model run: 12.399 seconds, 240.6 MiB peak RSS; comparison peak 305.1 MiB.
- Generated result gzip SHA-256: `9e440db479ba52650dbe61886fcc0df19aa3a0338c2204ba3671740abdc1a7dc`.

The matched outcome remains 109 settled modeled orders at unit-return PF 19.554 and 206 open marks. Settled plus marked endpoint diagnostic PF is 0.774226, net −14.416 return points. This is a same-window source regression, not fresh profitability evidence. Consistent positive returns are not established.

The separate actual-tick regression passes seven cases, covering all Exit sets/directions, flat-bar updates, lane independence, duplicate guards, adjusted-TP close accounting and ordinary trailing stops.

Reproduce:

```sh
node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261018-runtime-regression.mjs --run
```
