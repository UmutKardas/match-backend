import { Injectable } from "@nestjs/common";
import { LeaderboardMode } from "src/common/constants/leaderboard.constants";
import { LeaderboardRedisService } from "./leaderboard.redis";
import { LeaderboardResponseDto } from "./dto/leaderboard-response.dto";
import { LeaderboardMapper } from "src/common/mapper/leaderboard.mapper";
import { UserService } from "../users/user.service";
import { leaderboardConfig } from "src/config/leaderboard.config";
import { UserDocument } from "../users/user.schema";

@Injectable()
export class LeaderboardService {
    constructor(
        private readonly leaderboardRedisService: LeaderboardRedisService,
        private readonly userService: UserService
    ) { }

    async getLeaderboard(userId: string, mode: LeaderboardMode): Promise<LeaderboardResponseDto> {
        const existRedis = await this.leaderboardRedisService.checkLeaderboardExists();

        return existRedis == 1 ?
            await this.getLeaderboardByMode(userId, mode) :
            await this.rebuildAndResponseByMode(userId, mode)
    }

    async rebuildAndResponseByMode(userId: string, mode: LeaderboardMode): Promise<LeaderboardResponseDto> {
        const cursor = this.userService.findUsersByIdsCursor([], { sort: false, lean: true, batchSize: leaderboardConfig.batchSize, exclude: true })
        let batch: UserDocument[] = [];

        for await (const user of cursor) {
            batch.push(user);

            if (batch.length === leaderboardConfig.batchSize) {
                await this.leaderboardRedisService.addUserInPipeline(batch)
                batch = [];
            }
        }

        if (batch.length > 0) {
            await this.leaderboardRedisService.addUserInPipeline(batch)
        }

        return this.getLeaderboardByMode(userId, mode);
    }

    async getLeaderboardByMode(userId: string, mode: LeaderboardMode): Promise<LeaderboardResponseDto> {
        const data = mode === LeaderboardMode.TOP100 ? await this.leaderboardRedisService.fetchTopPlayers() : await this.leaderboardRedisService.getAround(userId);
        const mappedLeaderboardData = LeaderboardMapper.toResponseDto(data);
        return mappedLeaderboardData;
    }
}