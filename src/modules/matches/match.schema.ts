import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "../users/user.schema";
import * as matchConstants from "src/common/constants/match.constants";

@Schema({ timestamps: true })
export class Match {
    @Prop({ type: [{ type: Types.ObjectId, ref: `${User.name}` }], required: true })
    userIds: Types.ObjectId[];

    @Prop({ required: true })
    scheduledAt: Date;

    @Prop({ required: true, enum: Object.values(matchConstants.MatchStatus), default: matchConstants.MatchStatus.SCHEDULED })
    status: matchConstants.MatchStatusType;

    @Prop({ type: Types.ObjectId, ref: `${User.name}` })
    winnerId?: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: `${User.name}` }] })
    loserIds?: Types.ObjectId[];

    @Prop()
    playedAt?: Date
}

export type MatchDocument = Match & Document

export const MatchSchema = SchemaFactory.createForClass(Match)

MatchSchema.index({ scheduleAt: 1, status: 1 })