import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    TZ: z.string().default("UTC")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error(
        'Missing environment variables:',
        parsed.error.issues.map(i => i.path.join('.')),
    );
    process.exit(1);
}

export const env = parsed.data;