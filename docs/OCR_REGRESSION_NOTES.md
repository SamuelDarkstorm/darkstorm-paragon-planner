# Helm OCR regression: October 31, 2026

The Equipment Helm diagnostic exposed a parsing failure before continuation merging: malformed primary-pass Healing Received data borrowed a Legendary power range, and preprocessing reconciliation retained that range instead of the supported second-pass record. Thorns was also lost because the usable pass spelled it `Thoms` (the `rn` pair was recognized as `m`). Header fallback accepted mixed border fragments in the item name.

The fix keeps affix values and ranges together as per-pass records. A bounded, internally consistent reading can recover an otherwise missing roll; conflicting supported rolls remain blank, and conflicting plausible ranges remain blank with an uncertainty label. Range wrapping stops at prose and other stat rows. A range separator cannot act as the roll after a stat label. Invalid rolls expose no orphaned decision range. Derived Life is recalculated from reconciled rows so a rejected OCR value cannot survive in the aggregate field.

A narrowly bounded stat alias recognizes the observed `Thoms` and `Tnorns` spellings as Thorns. Mixed border fragments keep the title uncertain rather than constructing a guessed item name. Confirmation requirements remain in force.

`tests/fixtures/helm-2026-10-31.json` is a manual transcription of the supplied diagnostic screenshots, not an original OCR export. The regression expects +887 Thorns [611–916], +7.4% Healing Received [7–11]%, and preserved 850 Item Power / 1,275 base Armor / 1,028 Life / 17.5% power [15–17.5]% / one empty socket. The conflicting Intelligence range is intentionally omitted while +90 remains available for review.

Run `node --test tests/*.test.cjs`. The fixture tests also cover pass-order independence, clean-title preservation, range wrapping, unrelated power prose, and rejected aggregate Life. This validates parsing and reconciliation of the transcribed text; the real image must still be reread in Codespaces.
