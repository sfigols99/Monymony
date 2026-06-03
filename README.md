# Monymony

Web app to manage **shared household expenses**. Members plan a monthly budget
from the sum of their salaries (weighted by each member's %), record expenses by
form or by **receipt photo (OCR)**, organize them with custom categories, and get
**alerts** when they overspend. Currency is **EUR (€)**. UI in **es / en / ca**.

Built with Next.js 15 (App Router), Supabase (Auth/Postgres/Storage), Tailwind v4
and next-intl. See `ROADMAP.md` for the phased plan and `CLAUDE.md` for
architecture notes.

## Development

Uses **pnpm** (run `corepack enable` once):

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase values
pnpm dev                     # http://localhost:3000
```

Apply the SQL migrations in `supabase/migrations/` (in order) from the Supabase
SQL editor.

## Receipt OCR

Scanning a receipt runs **entirely in the browser** with
[Tesseract.js](https://github.com/naptha/tesseract.js) (WASM) — no OCR server,
no API key, nothing to pay, and the image isn't sent to any third party. The
image is uploaded to a private Supabase Storage bucket (`receipts`), the text is
recognized client-side, and `lib/ocr/parse.ts` extracts the amount, date and
merchant to pre-fill the expense form for you to review before saving.

The OCR layer is **pluggable** (`lib/ocr/`): the `OCRProvider` interface lets a
future remote provider (LLM vision / a self-hosted PaddleOCR service behind
`/api/ocr`) be swapped in without changing the UI.

## Self-hosting with Docker

The repo ships a standalone Next.js image. The public Supabase values are inlined
at build time, so pass them as build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -t monymony .

docker run -p 3000:3000 monymony
```

You still need a Supabase project (or self-hosted Supabase) with the migrations
applied. OCR runs in the browser, so no extra container is required.

## License

Open source. Contributions welcome.
