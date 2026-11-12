# Explicit demo instance tags

A nonempty `CTS_CORE_LIVE_TAG` must match 2–12 alphanumeric characters followed by a single underscore. The former helper silently used the shared project default when an explicit value contained an internal underscore or exceeded the limit. A malformed requested namespace now fails before a live runtime can be admitted. An omitted value retains the established project/connection default. Other CTS projects and connections are still rejected.

Pure identity tests verify valid case normalization, all entry/control kinds, foreign project rejection, malformed instance rejection and separation between two instances of the same connection. The bounded demo launcher uses `CTSBV2N12AO2_` for the isolated repeat. The earlier general-prefix observation is kept as a distinct run and must not be described as proving instance isolation or positive execution PF.
