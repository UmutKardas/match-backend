import { LeaderboardEntryDto } from "src/modules/leaderboard/dto/leaderboard-entry.dto";
import { LeaderboardResponseDto } from "src/modules/leaderboard/dto/leaderboard-response.dto";

export class LeaderboardMapper {

    static toResponseDto(raw: string[]): LeaderboardResponseDto {
        const leaderboard: LeaderboardEntryDto[] = Array.from({ length: raw.length / 2 }, (_, i) => {
            return this.toEntryDto(raw[i * 2], Number(raw[i * 2 + 1]), Number(i + 1))
        });

        return {
            leaderboard: leaderboard
        }
    }

    static toEntryDto(userId: string, score: number, rank?: number): LeaderboardEntryDto {
        return {
            userId: userId,
            score: score,
            rank: rank
        }
    }


}