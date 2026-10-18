# Final-source Exit replay regression

This repeats the same reused retrospective24h sample under the final corrected source. It is a correctness regression, not new market-performance evidence. Original protocols, runners and results are preserved unchanged.

**Every economic result matches exactly.** Canonical economic SHA-256: `cebdce48a2ca9c9876c014485ac4630118f34468693bd35ef18caf1e83ad08c3`. Comparison includes all settled trades, open marks, per-config evaluations, per-step checks, hourly/family returns, skips, and qualification diagnostics. Only the explicitly recorded timing/provenance fields are excluded.

The unchanged result remains **109 settled orders**, settled unit-return PF **19.554**. **206 open marks** reduce the endpoint-inclusive diagnostic to PF **0.774226**, net **-14.416 return points**. The endpoint-inclusive result is losing. This regression does not establish consistent profitability.

Settings, costs, gates, formulas,794 configured pairs, four symbols,72h indicator-only warmup,168h evaluated prehistory,24h trading, and unified default WF controls are identical to the original frozen replay. The exact same bounded public input is reused. Sixteen-pair fitting/build chunks still retain all qualified tapes for one unified WF.

Exactly two changed source files are admitted. Their corrections add canonical pair identities to the Exit cache fingerprint, bound continuous local fallback to sixteen-pair chunks with memo cleanup, and enroll Exit in saved preset backtests with adequate independent history. Their exact final source is archived separately. This direct replay does not hit runtime fit caching, continuous runtime fallback, or the saved-preset launch path; separate tests establish those corrected behaviors. The replay checks that their final imported source preserves prior direct replay economics.

Model runtime 38112ms; maximum RSS through comparison 297.9MiB. Frozen protocol SHA-256: `57d220904b462fe4457068012e719eb61e48f82c3087742a3be7faa26fc36d34`. Lossless result gzip SHA-256: `421f23c325ff0a9eecf1ab0332ce11e3c83da7438e1b939323e0d7beb986f6de`.

Reproduce from the final source snapshot:

```sh
node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-cache-regression.mjs --run
```
