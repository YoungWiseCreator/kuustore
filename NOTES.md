# KuuStore full-stack preview — design contract (NOTES)

Cameron's order 2026-11-17 16:26 EST: kuustore.life never got its full
four-layer hookup. This branch (`full-stack-preview-2026-11-17`) runs the
whole stack in preview only. Live `main` is untouched; nothing here ships
without Cameron's verdict on the clickable preview.

## The stack, as run

- **Layer 0 — Robert's method** (already live): blueprint-true structure,
  the service pages, menus, galleries and booking wiring as built.
- **Layer 1 — Hallmark + no-slop gate**: baseline recorded before any edit
  (`.hallmark/before.txt`): **113 FAIL · 58 REFLEX · 118 WARN**. Target:
  sloplint both tiers (source + render) at 0 FAIL · 0 WARN, with waivers
  only on the record in the stylesheet stamp. Kept-wiring record:
  79 links · 6 fields · 45 script hooks (`.hallmark/before.json`).
- **Layer 2 — Taste** (`design-taste-frontend`, draw seed 1239378587):
  direction **split-stage**. Dials declared for this site:
  **DESIGN_VARIANCE 7 · MOTION_INTENSITY 4 · VISUAL_DENSITY 6**
  (a warm, crafted storefront: composed but not wild, gentle motion,
  content-rich). Distinct from the Bible site (quiet, text-first) and
  Big Screen Tea (bold tabloid energy) by construction.
  - Idea: *the finished style, seen in the shop mirror* becomes *the
    fixed half of the screen that never moves while everything you can
    book scrolls past it, changing as each service arrives.*
  - Live thing: the mirror itself — the sticky rail photograph crossfades
    to the service section you are reading (hair, brows, nails, fungal
    care, the shop). No-JS and reduced-motion: the first frame holds.
  - Redraws: 1 — type. Dealt STIX Two Text (a dry document face, specced
    by its own sheet for memos and tools) fought the subject; redraw dealt
    **Work Sans** (300 display / 400 text / 500 emphasis), a light
    grotesque the library aims at fashion houses and calm brand sites.
  - Palette kept from the brand (draw `--keep palette`): KuuStore pink
    `#E6258E`, teal `#2DD4BF`, ink `#221525`, warm paper grounds. A deeper
    action pink `#CF1F80` is added as a token for filled buttons so white
    text clears 4.5:1 (gate 40).
  - Dealt "desert and road" atmosphere photos: not used — the project's
    own photographs fill every slot (preference order 1 on the sheet).
  - Corners: square throughout (the brand's established system), one
    button shape, one container, one column gap.
- **Layer 3 — Depth (Open Design strategies × Scrollcraft)**:
  - Grammar: chaptered editorial with one split-stage chapter (the home
    hero + services run beside the fixed mirror rail).
  - Signature move: the mirror crossfade (above) — scroll-linked,
    IntersectionObserver, transform/opacity only, ~1.6s fades.
  - Engineered peak: the 70/30 split, staged full-width on the home page
    as the money chapter — the bar grows to its 70/30 measure on a CSS
    scroll-driven timeline (`animation-timeline: view()`), the "70%" set
    at display size; silence before it (the quiet tools chapter), and the
    page resolves into the booking call. No-JS / reduced-motion /
    no-support: the bar stands at its true 70/30, fully readable.
  - Depth tools: ink-tinted offset shadows (the brand's die-cut system),
    overlap (rail photo overlaps the sheet edge; band panels), edge light
    (3px ink borders), scale-as-distance (band hover grows the image
    inside its frame, never the layout).
  - Tokens for the whole layer are declared once in the `:root` block of
    `assets/styles.css` and read by both stylesheet and script.
  - Verification: scroll-walk screenshots at fine steps (desktop + phone
    + reduced motion) alongside the sloplint render tier and the taste
    inspector.

## The language hookup (the other half of "full hookup")

Full 7-language toggle in the header chrome of every page — English ·
Español · Français · Português · Русский · 中文 · עברית (no Kreyòl) —
built exactly on the Bible site's system: per-page positional string
arrays (`#i18n-{lang}` JSON blocks), the fleet walker script, parity =
array length equals the page's text-node count, Hebrew scoped `dir=rtl`
on content blocks only. Desktop: the switch sits in the chrome row under
the nav. Mobile (≤800px): the switch becomes a full-width even grid
(4 over 3, 44px targets) and the call button takes its own full-width
row beneath it — the BST/Bible standard. Translations produced by the
fleet pipeline (`lang-audit-work`: fill lanes per language, checkpointed
cache, build-static injection); 1,729 unique string cores across 34
pages. Language names are identity strings and are never translated.

## Preserved exactly

- Every page, price, service and line of copy (punctuation-level gate
  fixes only: em-dashes and middle-dot bylines tightened per copy gates
  19/63, straight quotes made typographic per F1, "COMING SOON" set in
  sentence case per gate 67 — each class listed in the handoff).
- Stripe links byte-intact, every one (deposit $25 / $5 and all service
  Pay buttons). Buttons say "Pay", never "Subscribe".
- Brand: "KuuStore / Keep U'r Uniqueness" only. The 70/30 split stays.
- Number 1-669-205-6138 in the chrome of every page (header call row).
- Gallery standard: one photo-grid block under each service, tight oval
  face blur as shipped, full hairstyles only.
- All wiring: lead forms (`lead-booking`, `lead-apply`), calculators,
  store catalog + bundle builder, lightbox, tools. Ids, names, handlers
  and script hooks kept (sloplint `--kept` verifies against the record).

## Defects repaired in this preview

- `store.html` carried a stale pre-rename header linking to
  `fungal-nail-care.html`, `brows.html` and `join.html` — three verified
  404s. The preview gives the store the site's standard header (links to
  the real pages: fungal-toenail-treatment, eyebrows, join-our-team).
- Catalog items whose published sales ended 2026-11-15 drop at refresh,
  per the catalog's own rules: item-049 (No7 Future Renew Day Cream),
  item-069 (Shark FlexStyle, Ruby Red), item-070 (Shark Glossi) — all
  Walmart, `sale_ends: 2026-11-15`. No prices invented, no dates extended.

## Build log (2026-11-17 evening)
- Home composition: hero + the four services moved into the split-stage reading
  column (band still breaks full-width right after); blog cards became
  editorial rows; the trust section became the ink peak chapter (70% figure,
  growing split bar, ticks, placeholder). No copy added or cut; two service
  rows drafted during the build were removed again for inventing text.
- Taste inspect allowances, on the record: shadow + button-fx (the uniform
  hard offset shadow is the incumbent Layer-0 brand device, shared by buttons,
  panels and photo frames alike; removing it from buttons only would break the
  system), no-footage (the project holds photographs only; a stock loop would
  violate the real-photos rule - defended absence).
- Sloplint waivers, on the record in the styles.css stamp: gate 58 (owner's
  words preserved), gate 19 for numeric ranges only (price/count data as
  built), and the kept-record drops (store.html's three verified-404 links,
  replaced by the site's real pages).
- Environment note: the desk sandbox intermittently EPERM-blocks fsync,
  O_EXCL lockfiles and read-only-mode writes (the known write-flap); git
  object writes and bulk copies needed retry loops. Translation lanes run on
  the Gemini engine (I18N_ENGINE=gemini) through a driver that skips the
  pipeline's multiprocessing deadline wrapper (POSIX semaphore EPERM) and
  uses 60-string batches.
- Taste inspect final: 0 FAIL. Remaining WARN (size-count at 768/390) defended:
  the counter sums distinct computed sizes across width classes, and the dealt
  scale is fluid (clamp), so one step yields one size per width; at any single
  width the prose sits on the dealt steps. off-centre allowed: the rail
  photograph is a deliberate full-bleed half of the split stage.
- Two render bugs found by the inspector and fixed: nav.main a colour beat
  .btn colour (Book now rendered ink-on-pink at 3.5:1; now paper-on-pink-deep),
  and the mobile rail collapsing to width 0 (grid align-items:start carried
  into the flex column; rail now width:100% under 800px).
