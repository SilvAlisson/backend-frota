import 'dotenv/config';
import { z } from 'zod';

// Define o schema das variáveis de ambiente
const envSchema = z.object({
    PORT: z.coerce.number().default(3001),
    TOKEN_SECRET: z.string({ message: "TOKEN_SECRET é obrigatório no .env" }),
    DATABASE_URL: z.string({ message: "DATABASE_URL é obrigatório no .env" }),

    // CORS_ORIGINS pode vir como string separada por vírgulas
    CORS_ORIGINS: z.string().default('*'),
});

// Tenta validar process.env
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Erro fatal: Variáveis de ambiente inválidas:", _env.error.format());
    throw new Error("Variáveis de ambiente inválidas.");
}

// Exporta o objeto validado
export const env = _env.data;