import { Expose } from "class-transformer";
import { LeaderboardEntryDto } from "./leaderboard-entry.dto";

export class LeaderboardResponseDto {
    @Expose()
    leaderboard: LeaderboardEntryDto[]
}