import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
    constructor(message: string, description: string = '', status: HttpStatus = HttpStatus.BAD_REQUEST) {
        super({ message, description }, status);
    }
}