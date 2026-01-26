import { Injectable } from "@nestjs/common";
import { MatchService } from "../match.service";
import { AnyBulkWriteOperation, Cursor, Types } from "mongoose";
import { MatchDocument } from "../match.schema";
import { UserService } from "src/modules/users/user.service";
import { matchConfig } from "src/config/match.config";
import { MatchStatus } from "src/common/constants/match.constants";
import { UserDocument } from "src/modules/users/user.schema";

@Injectable()
export class MatchSimulationService {
    constructor(
        private readonly matchService: MatchService,
        private readonly userService: UserService
    ) { }

    async runMatchSimulation() {
        const playableMatches = this.matchService.findPlayableMatchsCursor();
        await this.processMatchBatches(playableMatches, matchConfig.batchSize)
    }

    private async processMatchBatches(cursor: Cursor<any, any, any>, batchSize: number) {
        let batch: MatchDocument[] = [];

        for await (const match of cursor) {
            batch.push(match);

            if (batch.length === batchSize) {
                await this.playScheduledMatches(batch)
                batch = [];
            }
        }

        if (batch.length > 0) {
            await this.playScheduledMatches(batch)
        }
    }

    async playScheduledMatches(matches: MatchDocument[]) {
        let matchBulkActions: AnyBulkWriteOperation<MatchDocument>[] = [];
        let userWinningOperations: AnyBulkWriteOperation<UserDocument>[] = [];
        let userLossOperations: AnyBulkWriteOperation<UserDocument>[] = [];

        for (const match of matches) {
            const { winnerId, loserIds } = this.selectRandomWinner(match.userIds);
            matchBulkActions.push(this.buildMatchUpdate(match, winnerId, loserIds));
            userWinningOperations.push(this.buildWinUpdate(winnerId));
            userLossOperations.push(...loserIds.map(x => this.buildLoseUpdate(x)))
        }

        await Promise.all([
            this.matchService.executeBulkOperations(matchBulkActions),
            this.userService.executeBulkOperations(userWinningOperations.concat(userLossOperations))

        ])

    }

    private selectRandomWinner(userIds: Types.ObjectId[]) {
        const randomIndex = Math.floor(Math.random() * userIds.length);
        const winnerId = userIds[randomIndex];
        const loserIds = userIds.filter(x => x.toString() !== winnerId.toString())

        return { winnerId, loserIds }
    }

    private buildMatchUpdate(match: MatchDocument, winnerId: Types.ObjectId, loserIds: Types.ObjectId[]) {
        return {
            updateOne: {
                filter: {
                    _id: match._id,
                    status: MatchStatus.SCHEDULED
                },
                update: {
                    $set: {
                        status: MatchStatus.PLAYED,
                        winnerId: winnerId,
                        loserIds: loserIds,
                        playedAt: new Date()
                    }
                }
            }
        }
    }

    private buildWinUpdate(winnerId: Types.ObjectId) {
        return {
            updateOne: {
                filter: { _id: winnerId },
                update: { $inc: { winCount: 1 } }
            }
        }
    }

    private buildLoseUpdate(loserId: Types.ObjectId) {
        return {
            updateOne: {
                filter: { _id: loserId },
                update: { $inc: { loseCount: 1 } }
            }
        }
    }
}