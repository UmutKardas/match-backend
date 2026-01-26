import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Match, MatchDocument } from "./match.schema";
import { AnyBulkWriteOperation, Model, } from "mongoose";
import { MatchStatus } from "src/common/constants/match.constants";
import { UserService } from "../users/user.service";
import { matchConfig } from "src/config/match.config";

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

    async executeBulkOperations(matchOperations: AnyBulkWriteOperation<MatchDocument>[]) {
        await this.matchModel.bulkWrite(matchOperations, { ordered: false });
    }

    findPlayableMatchsCursor() {
        const now = new Date();

        return this.matchModel
            .find({
                status: MatchStatus.SCHEDULED,
                scheduledAt: { $lte: now }
            })
            .lean()
            .cursor({ batchSize: matchConfig.batchSize });
    }
}