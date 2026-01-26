import { UserDocument } from "src/modules/users/user.schema";

export interface UserGroup {
    users: UserDocument[];
}
