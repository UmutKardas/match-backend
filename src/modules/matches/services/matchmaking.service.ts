import { Match } from "../match.schema";
import { Cursor, Types } from "mongoose";
import { UserService } from "src/modules/users/user.service";
import { matchConfig } from "src/config/match.config";
import { MatchService } from "../match.service";
import { UserDocument } from "src/modules/users/user.schema";
import { Injectable } from "@nestjs/common";
import { UserGroup } from "../interfaces/user-group.interface";

@Injectable()
export class MatchmakingService {
    constructor(
        private readonly userService: UserService,
        private readonly matchService: MatchService
    ) { }

    async runMatchmaking() {
        const schuledUserIds = await this.matchService.getSchuledUserIds();
        const unscheduledUsers = this.getUnscheduledUsers(schuledUserIds);
        await this.processUsersInBatches(unscheduledUsers, matchConfig.batchSize, matchConfig.groupSize);
    }

    getUnscheduledUsers(schuledUserIds: Types.ObjectId[]) {
        return this.userService.findUsersByIdsCursor(schuledUserIds, { sort: true, lean: true, exclude: true })
    }

    async processUsersInBatches(cursor: Cursor<any, any, any>, batchSize: number, groupSize: number) {
        let batch: UserDocument[] = [];

        for await (const user of cursor) {
            batch.push(user);

            if (batch.length === batchSize) {
                await this.allocateUsersToMatchGroup(batch, groupSize)
                batch = [];
            }
        }

        if (batch.length > 0) {
            await this.allocateUsersToMatchGroup(batch, groupSize);
        }
    }

    createGroups(users: UserDocument[], groupSize: number): UserGroup[] {
        const groups: UserGroup[] = [];
        for (let i = 0; i < users.length; i += groupSize) {
            groups.push({ users: users.slice(i, i + groupSize) });
        }
        return groups;
    }

    async saveMatches(groups: UserGroup[]) {
        const matches: Partial<Match>[] = []
        const matchTime = this.fetchMatchTime();

        for (const group of groups) {
            matches.push({
                userIds: group.users.map(x => x._id),
                scheduledAt: matchTime
            })
        }

        await this.matchService.addMultipleMatches(matches);
    }

    async allocateUsersToMatchGroup(batch: UserDocument[], groupSize: number) {
        let lastGroup = await this.matchService.getLastScheduledMatch();


        if (lastGroup && lastGroup.userIds.length < groupSize) {
            const availableSlotCount = groupSize - lastGroup.userIds.length;
            const usersToAdd = batch.slice(0, availableSlotCount)
            lastGroup.userIds.push(...usersToAdd.map(x => x._id))
            await lastGroup.save();
            batch = batch.slice(availableSlotCount);
        }

        if (batch.length > 0) {
            const groups = this.createGroups(batch, groupSize);
            await this.saveMatches(groups);
        }
    }

    fetchMatchTime() {
        const now = new Date();

        const matchDate = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            8, 0, 0, 0))

        if (now.getUTCHours() > 7) {
            matchDate.setUTCDate(matchDate.getUTCDate() + 1)
        }

        return matchDate;
    }
}