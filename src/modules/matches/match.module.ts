import { Module } from "@nestjs/common";
import { MatchService } from "./match.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Match, MatchSchema } from "./match.schema";
import { MatchCron } from "./match.cron";
import { UserModule } from "../users/user.module";

@Module({
    imports: [MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]), UserModule],
    providers: [MatchService, MatchCron],
    exports: []
})

export class MatchModule { }