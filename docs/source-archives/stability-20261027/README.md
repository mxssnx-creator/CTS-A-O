# Preserved local stability history

This archive preserves the 28 local commits from base 9eddc1946ca9e55e44b131c1977f444a69c8f666 through 35112f3e5aafd5f2db432b71d279ef13ec149297. The bundle's prerequisite is that base commit; its original commit IDs and trees remain intact. It is retained on this archive branch because the connector that publishes the final snapshot cannot upload original Git commit objects.

To restore the history from a clone containing the base:

```sh
cat docs/source-archives/stability-20261027/history.bundle.part01 docs/source-archives/stability-20261027/history.bundle.part02 docs/source-archives/stability-20261027/history.bundle.part03 > /tmp/cts-stability-history.bundle
sha256sum /tmp/cts-stability-history.bundle
# expected a806f9f908230ad82191278c2f407a4a2a9e91b1fea99a42ef778cf4cfca0d49
git bundle verify /tmp/cts-stability-history.bundle
git fetch /tmp/cts-stability-history.bundle HEAD:refs/heads/restored/stability-20261027
```

The records are simulated public-market studies, not exchange-fill evidence. Follow the original reports for measured scopes, failed checks and limitations. No account credentials are included.
