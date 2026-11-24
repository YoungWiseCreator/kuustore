# KuuStore full-stack redesign — GO-LIVE plan (staged 2026-11-17, awaiting Cameron's verdict)

**Nothing in this file has been executed against live.** The redesign sits in the
preview worktree (`~/workspace/beauty-kuustore/preview-build`, branch
`full-stack-preview-2026-11-17` of YoungWiseCreator/kuustore) and at the
clickable preview: https://youngwisecreator.github.io/kuustore-preview/
The live checkout `~/workspace/beauty-kuustore/build` (branch `main`, GitHub
Pages → kuustore.life) is untouched.

## Promotion — one step on Cameron's approval

1. Push the preview branch if not already pushed:
   `cd ~/workspace/beauty-kuustore/preview-build && git push origin full-stack-preview-2026-11-17`
2. Merge into the live checkout and push (Pages redeploys automatically):
   ```
   cd ~/workspace/beauty-kuustore/build
   git fetch origin
   git merge --no-ff origin/full-stack-preview-2026-11-17
   git push origin main
   ```
3. Wait for the Pages build to finish (watch
   `gh-pat GET /repos/YoungWiseCreator/kuustore/pages/builds` until `status: built`),
   then run the verification checklist below against https://kuustore.life.

What goes live with the merge, beyond presentation: the 7-language toggle on all
33 pages; store.html's stale header replaced by the standard header (its 3
verified-404 links now point at the site's real pages); 3 store-catalog items
removed whose published Walmart sales ended 2026-11-15 (No7 Future Renew Day
Cream, Shark FlexStyle Ruby Red, Shark Glossi 2-in-1 — dropped per the
catalog's own refresh rules, no prices invented). All Stripe links are
byte-identical to live (verified by set diff, 14 links).

## Rollback

`cd ~/workspace/beauty-kuustore/build && git revert -m 1 <merge-commit> && git push origin main`
— Pages redeploys the pre-redesign site; the preview branch and preview repo
stay intact for a second attempt.

## Post-live verification checklist (run in order, report each by name)

1. **Served bytes**: `curl -s https://kuustore.life/ | grep -c "Work Sans"` ≥ 1
   and the home page contains `class="stage"` and `id="i18n-es"`; spot-fetch
   hair.html, booking.html, store.html, one blog post for the same markers.
2. **Toggle parity + click-switch on live**: Playwright against
   https://kuustore.life — on index.html, hair.html and one blog post, click
   Español, Русский, עברית; assert visible copy changes, every `#i18n-*` array
   length equals the live text-node count, and Hebrew sets `dir="rtl"` on
   content blocks only. Repeat at 375px width: switch renders as the 4-column
   grid with the full-width Call row beneath.
3. **Stripe byte-intact on live**: fetch booking.html + store.html from the
   domain; the buy.stripe.com URL set must equal the preview set exactly —
   deposit $25 `buy.stripe.com/28E9ATcgu51n5UV2afeAg0V`, deposit $5
   `buy.stripe.com/28E14neoCbpLerrcOTeAg0W` (×2 in booking), 14 links total.
4. **Booking flow spot-check**: booking page form renders all fields; the
   service select lists every service; paybox buttons resolve (HTTP 200 from
   Stripe on a HEAD follow, no purchase); lead form endpoint unchanged
   (POST bookings.chasethealgo.com/api/lead).
5. **Number in chrome**: crawl all 33 pages on the domain; each header carries
   `tel:+16692056138` with the visible label "Call 1-669-205-6138".
6. **Catalog**: store page renders 238 items; the 3 expired-sale items absent.
7. **Gates on the live tree**: `sloplint --kept` against the pre-merge record
   shows no new FAIL beyond the two stamped waivers (58 word budgets; 19
   numeric ranges).
