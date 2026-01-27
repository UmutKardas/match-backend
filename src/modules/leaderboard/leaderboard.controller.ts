import { Controller, Get, Query } from "@nestjs/common";
import { LeaderboardMode } from "src/common/constants/leaderboard.constants";
import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardResponseDto } from "./dto/leaderboard-response.dto";

@Controller('leaderboard')
export class LeaderboardController {
    constructor(
        private readonly leaderboardService: LeaderboardService
    ) { }

    @Get()
    async getLeaderboard(@Query('userId') userId: string, @Query('mode') mode: LeaderboardMode): Promise<LeaderboardResponseDto> {
        const data = this.leaderboardService.getLeaderboard(userId, mode);
        return data;
    }
}