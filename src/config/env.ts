import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    PORT: z.coerce.number().default(3001),

    // Zod v4: Use 'error' em vez de 'message'
    TOKEN_SECRET: z.string({ error: "TOKEN_SECRET é obrigatório no .env" }),

    // CRÍTICO: Se isso falhar, o Prisma não sobe
    DATABASE_URL: z.string({ error: "DATABASE_URL é obrigatório no .env" }),

    CORS_ORIGINS: z.string().default('*'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    // format() ainda existe na v4, mas treeifyError é preferido se quiser logs bonitos.
    // Para crashar o app, format() resolve.
    console.error("❌ Erro fatal: Variáveis de ambiente inválidas:", _env.error.format());
    throw new Error("Variáveis de ambiente inválidas.");
}

export const env = _env.data;