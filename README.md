# Ponkr — AI trading agent & token launchpad (Robinhood Chain)

Ponkr adalah platform agen AI untuk **riset, trading, dan launch token** lewat chat, dibangun di atas
kontrak launchpad bonding-curve yang sudah live di **Robinhood Chain** (chain id `4663`).

## Fitur

| Fitur | Lokasi |
|---|---|
| Agen AI via chat (Claude + tools on-chain): cari token, quote, buy/sell, launch, portfolio, klaim fee | `/chat`, `src/lib/server/agent.ts` |
| Launchpad: supply 1B tetap, bonding curve ETH, auto-graduate ke pool Uniswap v4 yang LP-nya dikunci permanen | `/launch` |
| Launch dari wallet sendiri (+ initial buy anti-snipe) **atau** gas-free (wallet platform yang bayar, fee 100% ke user) | `src/lib/server/tx.ts`, `deployer.ts` |
| Fee recipient bisa diarahkan ke alamat lain, creator tax 0–10%, opsi buyback | form launch |
| Daftar launch live dari chain (new / top mcap / mau graduate / graduated / launched via Ponkr) + search | `/launches` |
| Halaman token: chart candlestick, histori trade, panel buy/sell dengan quote & slippage, progress bonding curve, harga pool v4 untuk token graduated | `/token/[address]` |
| Leaderboard token & creator | `/leaderboard` |
| Portfolio wallet | `/portfolio` |
| Dashboard fee creator: sweep & klaim | `/fees` |
| Langganan Club (bayar ETH on-chain, unlimited chat, limit API lebih tinggi) | `/club` |
| API key (login tanda tangan wallet), Agent API (prompt → job → polling), Launch API, endpoint publik | `/api-keys`, `/docs` |
| Bot Telegram (webhook) dan bot X (worker polling mention) | `api/telegram/webhook`, `scripts/x-bot.mjs` |
| CLI | `cli/ponkr.mjs` |

## Menjalankan

```bash
cp .env.example .env.local   # isi ANTHROPIC_API_KEY minimal
npm install
npm run dev                  # http://localhost:3000
```

Variabel penting (`.env.example`):

- `ANTHROPIC_API_KEY` — wajib untuk agen.
- `NEXT_PUBLIC_WC_PROJECT_ID` — WalletConnect/Reown project id.
- `PINATA_JWT` — upload logo ke IPFS.
- `DEPLOYER_PRIVATE_KEY` — wallet platform untuk launch gas-free (isi sedikit ETH di Robinhood Chain). Kosongkan untuk mematikan.
- `NEXT_PUBLIC_TREASURY_ADDRESS` — penerima pembayaran Club.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` — lalu set webhook:
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<host>/api/telegram/webhook&secret_token=<SECRET>`
- Bot X: isi kredensial `X_*` + `INTERNAL_SECRET`, jalankan `PONKR_HOST=https://<host> node scripts/x-bot.mjs`.

### Produksi

```bash
docker build -t ponkr . && docker run -p 3000:3000 -v ponkr-data:/data --env-file .env.local ponkr
```

Data (index launch, API key, member Club, job) disimpan sebagai file JSON di `DATA_DIR`. Cocok untuk satu
server (VPS/Docker). Untuk multi-instance / serverless, ganti `src/lib/server/store.ts` dengan Postgres/Redis.

## Cara kerja indexer

- Launch dibaca dari event `TokenLaunched` milik factory (alamat kontrak di `src/lib/config.ts`).
- Factory sudah memancarkan ~900 ribu launch, jadi secara default yang di-index adalah jendela terbaru
  (`INDEXER_LOOKBACK_BLOCKS`, default 12 juta blok ≈ 14 hari). Token lama tetap bisa dibuka lewat alamatnya
  (diambil langsung dari chain saat diminta). Set `INDEXER_START_BLOCK` untuk index penuh.
- `eth_getLogs` dipanggil mentah dengan pemecahan rentang otomatis (RPC membatasi 10k log & 10 juta blok per query).
- Harga token graduated dibaca dari `slot0` pool Uniswap v4 via `PoolManager.extsload`.

## Catatan

- Trading di app hanya untuk fase bonding curve dengan pair ETH. Token graduated diperdagangkan di pool Uniswap v4.
- Kontrak launchpad belum selesai diaudit menurut dokumentasi resminya. Gunakan dengan risiko sendiri.
