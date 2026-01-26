import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserSeed } from "./user.seed";

@Module({
    imports: [],
    providers: [UserService, UserSeed],
    exports: []
})

export class UserModule { }