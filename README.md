# OT Bay Builders PandaDoc Proposal Skill

Production-ready OpenClaw skill and HTTP service that routes Telegram + Twilio WhatsApp messages per salesperson, generates PandaDoc proposals, and tracks document status.

---

## ✅ Quick Start (Recommended)
This guided installer handles the setup end-to-end and prompts you for OpenClaw integration details.

```bash
npm run setup
```

The installer will:
- Install dependencies
- Create your `.env`
- Run migrations
- Build the project
- Create an OpenClaw loader entry (optional)

---

## Prerequisites
> Works on macOS (Mac mini), Linux, and Windows.

- **Node.js 20+**
- **PostgreSQL 15+**
- PandaDoc API key and template ID
- Twilio WhatsApp sender + credentials

### macOS quick installs
```bash
brew install node
brew install postgresql@15
```

Start Postgres:
```bash
brew services start postgresql@15
```

---

## Manual Installation
If you prefer manual steps:

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL`
- `PANDADOC_API_KEY`
- `PANDADOC_TEMPLATE_ID`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `ADMIN_API_KEY`

Run migrations:
```bash
npm run migrate
```

Build the project:
```bash
npm run build
```

Start the server:
```bash
npm run dev
```

---

## OpenClaw Integration (Easy Mode)
The installer can set this up automatically. Run:
```bash
npm run setup
```

When prompted, enter your OpenClaw **skills directory**. The installer will create:
```
<skills_dir>/otbay_pandadoc_proposals/index.js
```
This loader exports the skill from this repo’s build output.

If you want to do it yourself:
1) Build the project:
```bash
npm run build
```
2) Create a loader file in your OpenClaw skills dir:
```js
// <skills_dir>/otbay_pandadoc_proposals/index.js
module.exports = require('/absolute/path/to/this/repo/dist/openclaw/skill');
```
3) Ensure OpenClaw is configured to load `otbay_pandadoc_proposals` from its skills directory.

---

## Twilio WhatsApp Webhook
Configure Twilio to POST to:
```
https://<your-host>/webhooks/twilio/whatsapp
```
Signature verification is enforced using `TWILIO_WEBHOOK_AUTH_TOKEN`.

---

## PandaDoc Setup
Set:
- `PANDADOC_API_KEY`
- `PANDADOC_TEMPLATE_ID`

Optional: customize variable mappings in `template_mappings`.

---

## Seed a Salesperson + Bind Channel
```bash
npm run seed:salesperson "Alex Rivera" "alex@otbaybuilders.com" "+14155550123" "WHATSAPP" "whatsapp:+14155550123"
```

---

## Smoke Test Commands
### 1) Simulate inbound WhatsApp
```bash
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+14155550123" \
  --data-urlencode "Body=create proposal for Narender patio enclosure 25k client supplies glass" \
  --data-urlencode "MessageSid=SM123"
```

### 2) Check status
```bash
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+14155550123" \
  --data-urlencode "Body=proposal status last" \
  --data-urlencode "MessageSid=SM124"
```

### 3) Resend last proposal
```bash
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+14155550123" \
  --data-urlencode "Body=resend last proposal" \
  --data-urlencode "MessageSid=SM125"
```

---

## Repo Tree
```
.
├── README.md
├── migrations
│   └── 001_init.sql
├── package.json
├── scripts
│   ├── migrate.ts
│   ├── onboardSalesperson.ts
│   └── setup.ts
├── src
│   ├── app.ts
│   ├── config
│   │   └── config.ts
│   ├── db
│   │   └── index.ts
│   ├── index.ts
│   ├── llm
│   │   └── openaiClient.ts
│   ├── openclaw
│   │   ├── skill.ts
│   │   └── types.ts
│   ├── services
│   │   ├── channelRouter.ts
│   │   ├── contextStore.ts
│   │   ├── intentEngine.ts
│   │   ├── pandadocClient.ts
│   │   ├── proposalAssembler.ts
│   │   ├── proposalSchema.ts
│   │   ├── skillHandler.ts
│   │   └── templateMapper.ts
│   └── utils
│       ├── logger.ts
│       └── twilio.ts
└── tests
    ├── channelRouter.test.ts
    ├── pandadocClient.test.ts
    ├── proposalSchema.test.ts
    ├── setupEnv.ts
    └── twilioSignature.test.ts
```

---

## Notes
- LLM output is validated by Zod. If validation fails, the system falls back to a deterministic draft with `send=false`.
- Proposal creation logs to `audit_log` with minimal metadata.
