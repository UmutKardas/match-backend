import { Module } from "@nestjs/common";
import { MatchService } from "./match.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Match, MatchSchema } from "./match.schema";
import { MatchCron } from "./match.cron";
import { UserModule } from "../users/user.module";
import { MatchmakingService } from "./services/matchmaking.service";
import { MatchSimulationService } from "./services/match-simulation.service";

@Module({
    imports: [MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]), UserModule],
    providers: [MatchService, MatchmakingService, MatchSimulationService, MatchCron],
    exports: []
})

export class MatchModule { }