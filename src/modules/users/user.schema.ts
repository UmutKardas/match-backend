import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
    timestamps: {
        createdAt: true,
        updatedAt: true
    }
})
export class User {
    @Prop({ required: true })
    rank: number;

    @Prop({ default: 0 })
    winCount: number;

    @Prop({ default: 0 })
    loseCount: number;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ rank: 1 })