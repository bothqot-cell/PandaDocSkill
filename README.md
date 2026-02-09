# OT Bay Builders PandaDoc Proposal Skill

`otbay_pandadoc_proposals` is an OpenClaw skill and HTTP service that routes Telegram and Twilio WhatsApp messages to the correct salesperson, generates PandaDoc proposals, and tracks document status.

## Features
- Multi-tenant salesperson routing (Telegram + WhatsApp).
- PandaDoc proposal creation, send, status checks, and share links.
- LLM-driven ProposalSpec generation with Zod validation and deterministic fallback.
- Twilio signature verification + rate-limited webhooks.
- Audit logging with redaction.

## Repo Tree
```
.
├── Dockerfile
├── README.md
├── docker-compose.yml
├── jest.config.js
├── migrations
│   └── 001_init.sql
├── package.json
├── scripts
│   ├── migrate.ts
│   └── onboardSalesperson.ts
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
    └── twilioSignature.test.ts
```

## Setup

### 1) Configure environment
```
cp .env.example .env
```
Set:
- `DATABASE_URL`
- `PANDADOC_API_KEY`
- `PANDADOC_TEMPLATE_ID`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `ADMIN_API_KEY`
- Optional LLM vars (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`)

### 2) Start services
```
docker-compose up
```

### 3) Run migrations
```
npm run migrate
```

### 4) Run tests
```
npm test
```

## Configure Twilio WhatsApp
1. Set your Twilio WhatsApp webhook to:
   `POST https://<your-host>/webhooks/twilio/whatsapp`
2. Ensure `TWILIO_WEBHOOK_AUTH_TOKEN` matches your Twilio Auth Token.
3. Requests are signature-verified.

## Configure PandaDoc
- Set `PANDADOC_API_KEY` and `PANDADOC_TEMPLATE_ID`.
- Optional: insert template mappings into `template_mappings` to customize variable mapping.

## Seed a salesperson + bind channel
```
npm run seed:salesperson "Alex Rivera" "alex@otbaybuilders.com" "+14155550123" "WHATSAPP" "whatsapp:+14155550123"
```

## OpenClaw Integration
The skill is exported from `src/openclaw/skill.ts`:
- name: `otbay_pandadoc_proposals`
- actions: `create_proposal`, `proposal_status`, `resend_proposal`, `update_proposal`

## Smoke Test Commands
### 1) Simulate inbound WhatsApp
```
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+14155550123" \
  --data-urlencode "Body=create proposal for Narender patio enclosure 25k client supplies glass" \
  --data-urlencode "MessageSid=SM123"
```

### 2) Check status
```
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+14155550123" \
  --data-urlencode "Body=proposal status last" \
  --data-urlencode "MessageSid=SM124"
```

### 3) Resend last proposal
```
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+14155550123" \
  --data-urlencode "Body=resend last proposal" \
  --data-urlencode "MessageSid=SM125"
```

## Notes
- LLM output is validated by Zod. If validation fails, the system falls back to a deterministic draft with `send=false`.
- Proposal creation logs to `audit_log` with minimal metadata.
