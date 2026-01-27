import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "src/config/env";

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis

    constructor() {
        this.client = new Redis({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD,
            maxRetriesPerRequest: null,
            enableReadyCheck: true
        })
    }

    get redis(): Redis {
        return this.client;
    }

    onModuleDestroy() {
        this.client.quit();
    }
}