import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

export class ResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            map(data => ({
                statusCode: response.statusCode,
                data,
            })),
        );
    }

}