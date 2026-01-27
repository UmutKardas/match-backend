import { Controller, Get, Query } from "@nestjs/common";
import { LeaderboardMode } from "src/common/constants/leaderboard.constants";
import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardResponseDto } from "./dto/leaderboard-response.dto";
import { AppException } from "src/common/exceptions/app.exception";

@Controller('leaderboard')
export class LeaderboardController {
    constructor(
        private readonly leaderboardService: LeaderboardService
    ) { }

    @Get()
    async getLeaderboard(@Query('userId') userId: string, @Query('mode') mode: LeaderboardMode): Promise<LeaderboardResponseDto> {
        if (!Object.values(LeaderboardMode).includes(mode as LeaderboardMode)) {
            throw new AppException(`Invalid mode: ${mode}`);
        }

        return await this.leaderboardService.getLeaderboard(userId, mode);
    }
}