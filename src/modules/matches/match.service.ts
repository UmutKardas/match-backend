import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Match, MatchDocument } from "./match.schema";
import { Model } from "mongoose";
import { MatchStatus } from "src/common/constants/match.constants";
import { UserService } from "../users/user.service";

@Injectable()
export class MatchService {
    constructor(
        @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
        private readonly userService: UserService
    ) { }

    async getSchuledUserIds() {
        return await this.matchModel.distinct('userIds', { status: MatchStatus.SCHEDULED })
    }

    async addMultipleMatches(matches: Partial<Match>[]) {
        await this.matchModel.insertMany(matches);
    }

    async getLastScheduledMatch() {
        return await this.matchModel
            .findOne({ status: MatchStatus.SCHEDULED })
            .sort({ createdAt: -1 })
            .exec();
    }
}