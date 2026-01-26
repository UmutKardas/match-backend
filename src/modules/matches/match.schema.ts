import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Match {
    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
    userIds: Types.ObjectId[];

    @Prop({ required: true })
    scheduledAt: Date;

    @Prop({ required: true, enum: ['scheduled', 'played'], default: 'scheduled' })
    status: 'scheduled';

    @Prop({ type: Types.ObjectId, ref: 'User' })
    winnerId?: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
    loserIds?: Types.ObjectId[];

    @Prop()
    playedAt?: Date
}

export type MatchDocument = Match & Document

export const MatchSchema = SchemaFactory.createForClass(Match)