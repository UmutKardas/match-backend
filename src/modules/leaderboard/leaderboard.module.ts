import { Module } from "@nestjs/common";
import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardRedisService } from "./leaderboard.redis";
import { RedisModule } from "src/infra/redis/redis.module";
import { UserModule } from "../users/user.module";

@Module({
    imports: [RedisModule, UserModule],
    controllers: [LeaderboardController],
    providers: [LeaderboardService, LeaderboardRedisService],
    exports: [LeaderboardRedisService]
})

export class LeaderboardModule { }