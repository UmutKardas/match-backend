import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./user.schema";
import { Model } from "mongoose";

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) { }

    async fetchTotalUsers(): Promise<number> {
        return await this.userModel.countDocuments();
    }

    async insertUsersCollection(users: Partial<User>[]) {
        await this.userModel.insertMany(users);
        await this.userModel.syncIndexes();
    }

    async findUsersByIdsArray(filteredUserIds: any[], options: { sort: boolean, lean: boolean, exclude?: boolean }) {
        const filter = options.exclude
            ? { _id: { $nin: filteredUserIds } }
            : { _id: { $in: filteredUserIds } };

        let query = this.userModel.find(filter);

        if (options.sort) query.sort({ rank: 1 });

        if (options.lean) query.lean();

        return await query.exec()
    }

    findUsersByIdsCursor(filteredUserIds: any[], options: { sort: boolean, lean: boolean, exclude?: boolean }) {
        const filter = options.exclude
            ? { _id: { $nin: filteredUserIds } }
            : { _id: { $in: filteredUserIds } };

        let query = this.userModel.find(filter);

        if (options.sort) query.sort({ rank: 1 });
        if (options.lean) query.lean();

        return query.cursor();
    }
}