import { Module } from "@nestjs/common";
import { MatchService } from "./match.service";

@Module({
    imports: [],
    providers: [MatchService],
    exports: []
})

export class MatchModule { }