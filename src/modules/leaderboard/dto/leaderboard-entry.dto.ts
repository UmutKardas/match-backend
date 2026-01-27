import { IsNumber, IsOptional, IsString } from "class-validator";


export class LeaderboardEntryDto {
    @IsString()
    userId: string;

    @IsNumber()
    score: number;

    @IsOptional()
    @IsNumber()
    rank?: number;
}