"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
class AuthController {
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!user || !await bcrypt_1.default.compare(password, user.password)) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, env_1.env.TOKEN_SECRET, { expiresIn: '30d' });
            res.status(200).json({
                message: 'Login bem-sucedido',
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    fotoUrl: user.fotoUrl
                },
            });
        }
        catch (error) {
            console.error("Erro no login:", error);
            res.status(500).json({ error: 'Erro interno' });
        }
    }
    static async loginWithToken(req, res) {
        try {
            const { loginToken } = req.body;
            const user = await prisma_1.prisma.user.findFirst({ where: { loginToken } });
            if (!user)
                return res.status(401).json({ error: 'Token inválido.' });
            // ALTERAÇÃO 1: Validade estendida para 1 ano (365 dias)
            // Isso garante que o login via QR Code não expire inesperadamente
            const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, env_1.env.TOKEN_SECRET, { expiresIn: '365d' });
            res.status(200).json({
                message: 'Login por token OK',
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    fotoUrl: user.fotoUrl
                },
            });
        }
        catch (error) {
            console.error("Erro login token:", error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    }
    static async generateToken(req, res) {
        try {
            // 1. Quem pode GERAR? Apenas Gestores (Admin e Encarregado)
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem gerar QR Code.' });
            }
            const { id } = req.params;
            const userToCheck = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!userToCheck)
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            // 2. Quem pode TER um QR Code? (Operador e Encarregado)
            if (userToCheck.role !== 'OPERADOR' && userToCheck.role !== 'ENCARREGADO') {
                return res.status(400).json({ error: 'Apenas Operadores e Encarregados podem ter acesso via QR Code.' });
            }
            // ALTERAÇÃO 2: Verificação de token existente
            // Se o usuário já possui um token, retornamos o existente.
            // Isso evita que um clique acidental invalide o crachá físico do operador.
            if (userToCheck.loginToken) {
                return res.json({ loginToken: userToCheck.loginToken });
            }
            // Se não existe, gera um novo
            const token = crypto_1.default.randomBytes(32).toString('hex');
            await prisma_1.prisma.user.update({
                where: { id },
                data: { loginToken: token }
            });
            res.json({ loginToken: token });
        }
        catch (error) {
            console.error("Erro ao gerar token:", error);
            res.status(500).json({ error: 'Erro ao gerar token.' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map