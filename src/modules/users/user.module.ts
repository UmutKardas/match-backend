import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserSeed } from "./user.seed";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./user.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
    providers: [UserService, UserSeed],
    exports: []
})

export class UserModule { }