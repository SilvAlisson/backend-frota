import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    PORT: z.coerce.number().default(3001),

    TOKEN_SECRET: z.string({ error: "TOKEN_SECRET é obrigatório no .env" }),

    // URL do Pooler (Porta 6543) - Usada pela aplicação em produção
    DATABASE_URL: z.string({ error: "DATABASE_URL é obrigatório no .env" }),

    // URL Direta (Porta 5432) - Obrigatória para o Prisma Migrate funcionar
    // Se não validar isso, o 'npx prisma migrate deploy' pode falhar silenciosamente ou dar erro de conexão
    DIRECT_URL: z.string({ error: "DIRECT_URL é obrigatória para migrações (schema.prisma)" }),

    CORS_ORIGINS: z.string().default('*'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Erro fatal: Variáveis de ambiente inválidas:", _env.error.format());
    throw new Error("Variáveis de ambiente inválidas.");
}

export const env = _env.data;