"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3001),
    TOKEN_SECRET: zod_1.z.string({ error: "TOKEN_SECRET é obrigatório no .env" }),
    DATABASE_URL: zod_1.z.string({ error: "DATABASE_URL é obrigatório no .env" }),
    DIRECT_URL: zod_1.z.string({ error: "DIRECT_URL é obrigatória para migrações (schema.prisma)" }),
    CORS_ORIGINS: zod_1.z.string().default('*'),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error("❌ Erro fatal: Variáveis de ambiente inválidas:", _env.error.format());
    throw new Error("Variáveis de ambiente inválidas.");
}
exports.env = _env.data;
//# sourceMappingURL=env.js.map