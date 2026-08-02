# Match Backend

A NestJS service that simulates a large-scale player matchmaking and leaderboard system. It seeds **500,000 players**, groups the unmatched ones into matches every hour, plays those matches once a day, and serves a Redis-backed leaderboard over HTTP.

Built with **NestJS 11 · MongoDB (Mongoose) · Redis (ioredis) · TypeScript · Pino**.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API](#api)
- [Scheduled Jobs](#scheduled-jobs)
- [Tuning Knobs](#tuning-knobs)
- [Design Notes](#design-notes)
- [Scripts](#scripts)

---

## How It Works

The system runs as one continuous pipeline with three stages:

```
                ┌──────────────────────────────────────────────┐
                │  1. SEED  (on application bootstrap)         │
                │  Insert users up to 500k, random rank 1-5000 │
                └───────────────────┬──────────────────────────┘
                                    │
                ┌───────────────────▼──────────────────────────┐
                │  2. MATCHMAKING  (cron: every hour)          │
                │  Users without a SCHEDULED match             │
                │  → sorted by rank → grouped into 10s         │
                │  → scheduled for the next 08:00 UTC          │
                └───────────────────┬──────────────────────────┘
                                    │
                ┌───────────────────▼──────────────────────────┐
                │  3. SIMULATION  (cron: daily at 08:00)       │
                │  For each due match: pick a random winner    │
                │  → match = PLAYED                            │
                │  → winner winCount+1, losers loseCount+1     │
                │  → ZINCRBY leaderboard:global winner +10     │
                └───────────────────┬──────────────────────────┘
                                    │
                ┌───────────────────▼──────────────────────────┐
                │  4. LEADERBOARD API  (GET /leaderboard)      │
                │  Reads the Redis sorted set                  │
                │  Rebuilds it from MongoDB if the key is gone │
                └──────────────────────────────────────────────┘
```

Because a played match no longer keeps its players in the `SCHEDULED` set, every player becomes eligible again on the next matchmaking run — the loop is self-sustaining.

### Seeding

[`UserSeed`](src/modules/users/user.seed.ts) implements `OnApplicationBootstrap`. It counts existing users and inserts only the difference up to `targetUserCount` (500,000), in batches of 5,000. If the target is already met, seeding is skipped — restarting the app is cheap.

### Matchmaking

[`MatchmakingService`](src/modules/matches/services/matchmaking.service.ts):

1. `distinct('userIds', { status: SCHEDULED })` collects everyone who already has a pending match.
2. All remaining users are streamed with a **Mongoose cursor** (`$nin` + `sort({ rank: 1 })`), so 500k documents never land in memory at once.
3. The stream is consumed in batches of `matchConfig.batchSize` (1,000) and sliced into groups of `matchConfig.groupSize` (10).
4. Before creating new matches, the last `SCHEDULED` match is topped up if it has free slots — this prevents a trail of half-empty matches across batch boundaries.
5. All matches for a run share one `scheduledAt`: today at **08:00 UTC**, or tomorrow at 08:00 if that has already passed.

Sorting by `rank` means players of similar skill end up in the same group — that's the matchmaking quality signal.

### Match Simulation

[`MatchSimulationService`](src/modules/matches/services/match-simulation.service.ts) streams every match with `status = SCHEDULED` and `scheduledAt <= now`, then for each batch builds three write sets and executes them concurrently:

| Target | Operation |
| --- | --- |
| `matches` | `bulkWrite` → status `PLAYED`, `winnerId`, `loserIds`, `playedAt` |
| `users` | `bulkWrite` → `$inc winCount` for winners, `$inc loseCount` for losers |
| Redis | pipelined `ZINCRBY leaderboard:global +10 <winnerId>` |

The match update is guarded by `{ _id, status: SCHEDULED }`, so a match can never be played twice even if a run overlaps. All bulk writes use `ordered: false` so one failed op doesn't abort the batch.

### Leaderboard

Scores live in the Redis sorted set `leaderboard:global`, where `score = winCount × 10`.

[`LeaderboardService`](src/modules/leaderboard/leaderboard.service.ts) checks `EXISTS` first. If the key is missing (cold Redis, flush, restart), it **rebuilds the whole set from MongoDB** by streaming users in batches of 1,000 and pipelining `ZADD`, then serves the request. MongoDB stays the source of truth; Redis is a rebuildable read model.

---

## Architecture

```
src/
├── config/          Environment + tuning constants
├── infra/           Connection-level concerns (Mongo, Redis)
├── modules/         Feature modules (users, matches, leaderboard)
└── common/          Cross-cutting: constants, mappers, filters, interceptors
```

Layering rules the codebase follows:

- **Controllers** validate input and delegate — no business logic.
- **Feature services** (`MatchmakingService`, `MatchSimulationService`, `LeaderboardService`) hold the domain logic.
- **Data services** (`MatchService`, `UserService`, `LeaderboardRedisService`) own all queries; no other layer touches a model or a Redis client.
- **Cron classes** are thin triggers with logging and error containment.

Global providers wired in [`app.module.ts`](src/app.module.ts):

- `ResponseInterceptor` — wraps every successful response in `{ statusCode, data }`
- `ApiExceptionFilter` — normalizes every error into `{ code, error: { message, description } }`
- `ValidationPipe` — global, registered in [`main.ts`](src/main.ts)
- `LoggerModule` (nestjs-pino) — structured JSON logging

---

## Project Structure

```
src/
├── main.ts                                   Bootstrap, global ValidationPipe
├── app.module.ts                             Root module, global interceptor & filter
├── config/
│   ├── env.ts                                Zod-validated env, fails fast on startup
│   ├── seed.config.ts                        targetUserCount, batchSize, maxRank
│   ├── match.config.ts                       batchSize, groupSize
│   └── leaderboard.config.ts                 batchSize, scoreMultiplier
├── infra/
│   ├── mongo/mongo.module.ts                 MongooseModule.forRootAsync + retry policy
│   └── redis/redis.service.ts                ioredis client, closed on module destroy
├── modules/
│   ├── users/
│   │   ├── user.schema.ts                    rank, winCount, loseCount (+ index on rank)
│   │   ├── user.service.ts                   cursor/array finders, bulk writes
│   │   ├── user.seed.ts                      Bootstrap seeding
│   │   └── user.module.ts
│   ├── matches/
│   │   ├── match.schema.ts                   userIds, scheduledAt, status, winner/losers
│   │   ├── match.service.ts                  Queries, cursors, bulk writes
│   │   ├── match.cron.ts                     Hourly + daily triggers
│   │   ├── services/matchmaking.service.ts
│   │   ├── services/match-simulation.service.ts
│   │   └── interfaces/user-group.interface.ts
│   └── leaderboard/
│       ├── leaderboard.controller.ts         GET /leaderboard
│       ├── leaderboard.service.ts            Read-through + rebuild logic
│       ├── leaderboard.redis.ts              ZADD / ZINCRBY / ZREVRANGE / ZREVRANK
│       └── dto/
└── common/
    ├── constants/                            MatchStatus, LeaderboardMode, Redis key
    ├── mapper/leaderboard.mapper.ts          Flat Redis array → typed DTO
    ├── exceptions/app.exception.ts           AppException (HTTP 400 by default)
    ├── filter/api.exception.filter.ts        Uniform error envelope
    └── interceptor/response.interceptor.ts   Uniform success envelope
```

### Data Models

**User**

| Field | Type | Notes |
| --- | --- | --- |
| `rank` | number | 1–5000, seeded randomly; indexed, drives match grouping |
| `winCount` | number | Default 0 |
| `loseCount` | number | Default 0 |
| `createdAt` / `updatedAt` | Date | Timestamps enabled |

**Match**

| Field | Type | Notes |
| --- | --- | --- |
| `userIds` | ObjectId[] | Up to `groupSize` (10) players |
| `scheduledAt` | Date | Next 08:00 UTC |
| `status` | `scheduled` \| `played` | Defaults to `scheduled` |
| `winnerId` | ObjectId? | Set on simulation |
| `loserIds` | ObjectId[]? | Set on simulation |
| `playedAt` | Date? | Set on simulation |

Compound indexes: `{ status, scheduledAt }` for the simulation query and `{ status, createdAt }` for the "last scheduled match" lookup.

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 6+
- Redis 6+

Quickest way to get the dependencies running locally:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7
```

### Install & Run

```bash
npm install

# create your env file (see the table below)
cat > .env <<'EOF'
MONGO_URI="mongodb://localhost:27017/studycase"
REDIS_HOST="localhost"
REDIS_PORT=6379
TZ="UTC"
EOF

npm run start:dev
```

> **First boot takes a while.** The app seeds 500,000 users before it is fully ready. Watch the `Seeding Users...` / `Seed Completed` log lines. Subsequent boots skip seeding.

The server listens on `PORT` (default **3000**).

### Production

```bash
npm run build
npm run start:prod
```

---

## Environment Variables

Validated at startup by [`config/env.ts`](src/config/env.ts) using Zod. **Missing required variables terminate the process** with the offending keys printed — no half-configured runs.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `REDIS_HOST` | ✅ | — | Redis host |
| `REDIS_PORT` | — | `6379` | Coerced to number |
| `REDIS_PASSWORD` | — | — | Optional Redis auth |
| `TZ` | — | `UTC` | Timezone for the daily simulation cron |
| `PORT` | — | `3000` | Read directly from `process.env` in `main.ts` |

---

## API

All responses pass through the global interceptor and filter, so the envelope is consistent.

### `GET /leaderboard`

| Query param | Required | Values | Description |
| --- | --- | --- | --- |
| `mode` | ✅ | `top100` \| `around` | Which slice of the leaderboard to return |
| `userId` | Only for `around` | Mongo `_id` string | The player to center the window on |

An unrecognized `mode` returns **400** before any I/O happens.

#### `mode=top100`

Returns the highest-scoring 100 players (`ZREVRANGE 0 99 WITHSCORES`).

```bash
curl "http://localhost:3000/leaderboard?mode=top100"
```

#### `mode=around`

Centers the window on the given player: 50 ranks above and 50 below (up to 101 entries, clamped at the top of the board). If the player isn't in the sorted set, the request fails with **400**.

```bash
curl "http://localhost:3000/leaderboard?mode=around&userId=65f1c2a9b4d3e7f012345678"
```

#### Success response

```json
{
  "statusCode": 200,
  "data": {
    "leaderboard": [
      { "userId": "65f1c2a9b4d3e7f012345678", "score": 120, "rank": 1 },
      { "userId": "65f1c2a9b4d3e7f012345679", "score": 110, "rank": 2 }
    ]
  }
}
```

> `rank` is the 1-based position **within the returned window**, not the global rank. For `mode=top100` the two coincide; for `mode=around` they do not.

#### Error response

```json
{
  "code": 400,
  "error": {
    "message": "Invalid mode: foo",
    "description": ""
  }
}
```

---

## Scheduled Jobs

Defined in [`match.cron.ts`](src/modules/matches/match.cron.ts). Both handlers wrap their work in try/catch and log through Pino, so a failed run never takes the process down.

| Job | Schedule | Timezone | What it does |
| --- | --- | --- | --- |
| `runMatchmaking` | `EVERY_HOUR` | server | Groups unmatched players into new scheduled matches |
| `playMatches` | `0 8 * * *` | `env.TZ` | Simulates every match that is due |

The hourly cadence means a player who just finished a match waits at most an hour to be queued for the next day's round.

---

## Tuning Knobs

Everything performance-relevant is centralized under [`src/config/`](src/config/) rather than scattered as magic numbers.

| File | Key | Default | Effect |
| --- | --- | --- | --- |
| `seed.config.ts` | `targetUserCount` | `500000` | Total players to seed |
| | `batchSize` | `5000` | Documents per `insertMany` |
| | `maxRank` | `5000` | Upper bound of the random rank |
| `match.config.ts` | `batchSize` | `1000` | Cursor batch size for matchmaking & simulation |
| | `groupSize` | `10` | Players per match |
| `leaderboard.config.ts` | `batchSize` | `1000` | Users per pipeline during a rebuild |
| | `scoreMultiplier` | `10` | `score = winCount × multiplier` |

---

## Design Notes

**Cursors over `find()`.** Every large read — matchmaking, simulation, leaderboard rebuild — streams with `.cursor({ batchSize })` and `.lean()`. Memory stays flat regardless of collection size; nothing loads 500k documents at once.

**Bulk writes over per-document updates.** A simulation batch of 1,000 matches produces ~1,000 match updates and ~10,000 user updates, all dispatched as two `bulkWrite` calls with `ordered: false` instead of 11,000 round trips.

**Redis pipelining.** Score updates and rebuild writes are pipelined, collapsing thousands of commands into a single round trip.

**Idempotent by construction.** Seeding checks the current count first; match updates filter on `status: SCHEDULED`; the leaderboard rebuild is a pure projection of MongoDB state. Restarting or re-running is always safe.

**Fail fast on config.** Zod validates the environment before Nest boots, so misconfiguration surfaces immediately rather than as a connection error minutes later.

**MongoDB is the source of truth.** Redis holds a derived read model that can be dropped at any time — the next leaderboard request transparently rebuilds it.

**Uniform HTTP contract.** One interceptor and one filter guarantee every route returns the same success and error shape, so clients never special-case an endpoint.

**Structured logging.** nestjs-pino emits JSON logs with automatic request context, ready for log aggregation; `pino-pretty` keeps local development readable.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the app |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start in watch + debug mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | ESLint with `--fix` |
| `npm run format` | Prettier over `src/` and `test/` |
| `npm run test` | Unit tests (Jest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:cov` | Coverage report |
| `npm run test:e2e` | End-to-end tests |

---

## License

UNLICENSED — private project.
