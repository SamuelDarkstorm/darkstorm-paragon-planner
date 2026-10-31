# Screenshot continuation intake

Equipment slots and Item A / Item B comparison use the same continuation controller and conservative merge function in `js/prototype.js`.

## Player flow

1. Choose and read the top screenshot inside the desired Equipment slot or comparison item.
2. If the tooltip continues below the image, choose **Add another view**. This action stays available even when OCR misses the scroll marker.
3. Check that the views show the same item and read the second view.
4. Review the combined fields, acknowledge that the full item is captured, then use the existing final confirmation button.

Another view can be added if the item needs more than two captures. A differing nonempty field or affix roll holds the entire merge for review. The prior form values remain intact; correct a bad current read or retry with a clearer/matching capture. Power prose joins only when one view contains the other or they have a matching three-word-or-longer boundary overlap. Other power fragments stay held for review.

## Trust boundary

- Each capture retains separate raw preprocessing passes in the temporary session. Different screenshots are never concatenated and reparsed as one tooltip.
- Missing fields can be filled; duplicate affixes match by stat. Conflicting values are not silently selected. Impossible visible-range combinations remain blocked.
- Comparison intake normalizes base Armor separately from bonus Armor.
- Selecting another image, changing fields, or merging more evidence revokes verification and invalidates the previous comparison.
- Confirmation handlers enforce the gate independently of button appearance.
- Reads that finish after image replacement, character changes, slot changes, or field edits cannot overwrite the current draft.
- Save/export records unresolved intake blockers, without image bytes. Reloading an unfinished draft requires reattaching the screenshots; it cannot upgrade the draft to verified data.
- Acknowledgement of matching views is a player check, not proof of identity supplied by OCR. Missing names on scrolled captures are allowed only with that explicit check and final review.

## Validation

Run `node --test tests/continuation.test.cjs` for the dependency-free regression tests.

Additional DOM integration checks were run with simulated OCR results for application startup, all ten equipment adapters, successful two-view intake, duplicate overlap, wrong-item rejection, edit invalidation, stale reads after removal, comparison gates, pending-draft save/reload, and character reset. These checks exercise the controller, not Tesseract recognition accuracy or visual layout.

Still required: test a real top/scrolled item pair in Codespaces, first in Helm and then in comparison. Check that names, base Armor, affixes, Aspect/Unique prose, and sockets remain accurate and that one final Gamer Verification is required.
