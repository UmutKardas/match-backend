import { Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "src/config/env";

@Injectable()
export class RedisService extends Redis {
    constructor() {
        super({
            host: env.REDIS_HOST,
            password: env.REDIS_PASSWORD,
            port: env.REDIS_PORT
        })
    }
}