# qa/ — run this before every upload

Four scripts. The first three are the test pass; the fourth cleans up after it.

```bash
npm run qa:api             # auth, catalogue, product CRUD, stock, orders, CORS
npm run qa:configurator    # the compatibility engine
npm run qa:static          # the built static export in apps/web/out
npm run qa                 # all three
node qa/purge.mjs --yes    # delete what qa:api left behind
```

`qa:api` and `qa:configurator` hit whichever API `API=` points at, defaulting to Render.
`qa:static` reads `apps/web/out`, so build first.

```bash
API=http://localhost:4000/api/v1 npm run qa:api
```

## What they actually catch

These are not smoke tests. Each one has caught a real defect or exists because something
was wrong once:

- **`qa:static` link integrity** — every internal `href` across 69 pages must resolve to a
  file on disk. On a static host a bad link is a hard 404, and there is no server to paper
  over it.
- **`qa:static` metadata** — this is how the English default 404 page was found, and how
  eight over-length meta descriptions were found before that. It checks title ≤ 60 and
  description ≤ 160 measured *after* decoding HTML entities, because `&quot;` is one
  character on the SERP and six in the file.
- **`qa:static` config** — asserts the API URL is compiled into the bundle and no
  `localhost` leaked. A build made against the wrong `NEXT_PUBLIC_API_URL` looks perfect
  and is completely dead once uploaded.
- **`qa:api` money** — every price an integer in centimes, floats refused on create *and*
  update. `compareAtPrice` must not corrupt `effectivePrice`.
- **`qa:api` orders** — stock deducted atomically, a repeated `Idempotency-Key` creates no
  second order, overselling refused, an order unreadable without its token (order numbers
  are sequential, so this is the only thing protecting them).
- **`qa:api` delete paths** — `DELETE` archives rather than deletes; a product referenced
  by an order refuses to be purged; an unreferenced one purges cleanly.
- **`qa:configurator`** — builds a real machine from the live catalogue, then breaks it on
  purpose and requires a violation. It also checks the −5% arithmetic, because a discount
  that silently stops applying is invisible until someone reconciles the till.

## Test data

`qa:api` writes only products it creates, named `ZZZ TEST CLAUDE <timestamp>`, and places
one order from `qa@example.com`. Everything else in the catalogue is read-only to it.

Each run leaves an archived product and a cancelled order behind — the API refuses to erase
order history, which is the right behaviour. `qa/purge.mjs` removes them directly from
MongoDB. It is anchored to the QA marker and aborts if any query matches an unmarked
document, so it cannot take a real product with it. Run it without `--yes` first; that
prints what it would delete and changes nothing.
