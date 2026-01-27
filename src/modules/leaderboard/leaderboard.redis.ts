import { Injectable } from "@nestjs/common";
import { AROUND_SIZE, LEADERBOARD_GLOBAL_KEY } from "src/common/constants/leaderboard.constants";
import { RedisService } from "src/infra/redis/redis.service";
import { UserDocument } from "../users/user.schema";
import { leaderboardConfig } from "src/config/leaderboard.config";
import { AppException } from "src/common/exceptions/app.exception";

@Injectable()
export class LeaderboardRedisService {
    constructor(
        private readonly redisService: RedisService
    ) { }

    async addUserInPipeline(users: UserDocument[]) {
        const pipeline = this.redisService.redis.pipeline();
        users.forEach(user => {
            pipeline.zadd(
                LEADERBOARD_GLOBAL_KEY,
                Number(user.winCount * leaderboardConfig.scoreMultiplier),
                user._id.toString()
            )
        })

        await pipeline.exec();
    }

    async updateUserScoresInPipeline(userIds: string[], score = 10) {
        const pipeline = this.redisService.redis.pipeline();
        userIds.forEach(userId => {
            pipeline.zincrby(
                LEADERBOARD_GLOBAL_KEY,
                score,
                userId
            );
        });
        await pipeline.exec();
    }

    async checkLeaderboardExists(): Promise<number> {
        return await this.redisService.redis.exists(LEADERBOARD_GLOBAL_KEY);
    }

    async fetchTopPlayers(): Promise<string[]> {
        return await this.redisService.redis.zrevrange(LEADERBOARD_GLOBAL_KEY, 0, 99, 'WITHSCORES');
    }

    async getAround(userId: string): Promise<string[]> {
        const rank = await this.redisService.redis.zrevrank(LEADERBOARD_GLOBAL_KEY, userId);

        if (rank == null) {
            throw new AppException(`User with ID ${userId} not found in leaderboard`);
        }

        const minValue = Math.max(0, rank - AROUND_SIZE);
        const maxValue = rank + 50;

        return await this.redisService.redis.zrevrange(LEADERBOARD_GLOBAL_KEY, minValue, maxValue, 'WITHSCORES')
    }
}