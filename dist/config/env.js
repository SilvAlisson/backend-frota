"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
// Define o schema das variáveis de ambiente
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3001),
    TOKEN_SECRET: zod_1.z.string({ message: "TOKEN_SECRET é obrigatório no .env" }),
    DATABASE_URL: zod_1.z.string({ message: "DATABASE_URL é obrigatório no .env" }),
    // CORS_ORIGINS pode vir como string separada por vírgulas
    CORS_ORIGINS: zod_1.z.string().default('*'),
});
// Tenta validar process.env
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error("❌ Erro fatal: Variáveis de ambiente inválidas:", _env.error.format());
    throw new Error("Variáveis de ambiente inválidas.");
}
// Exporta o objeto validado
exports.env = _env.data;
//# sourceMappingURL=env.js.map