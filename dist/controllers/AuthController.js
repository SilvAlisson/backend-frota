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
// 1. Verificação de segurança no início do arquivo
if (!process.env.TOKEN_SECRET) {
    console.error("Erro Crítico: TOKEN_SECRET não definido no ficheiro .env");
    process.exit(1); // Encerra a aplicação se não houver segredo
}
// 2. Atribuição segura: O TypeScript agora sabe que é sempre uma string
const TOKEN_SECRET = process.env.TOKEN_SECRET;
class AuthController {
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ error: 'Credenciais obrigatórias.' });
            const user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!user || !await bcrypt_1.default.compare(password, user.password)) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }
            // O TOKEN_SECRET aqui já é garantidamente uma string
            const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, TOKEN_SECRET, { expiresIn: '8h' });
            res.status(200).json({
                message: 'Login bem-sucedido',
                token,
                user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
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
            if (!loginToken)
                return res.status(400).json({ error: 'Token obrigatório.' });
            const user = await prisma_1.prisma.user.findFirst({ where: { loginToken } });
            if (!user)
                return res.status(401).json({ error: 'Token inválido.' });
            const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, TOKEN_SECRET, { expiresIn: '8h' });
            res.status(200).json({
                message: 'Login por token OK',
                token,
                user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
            });
        }
        catch (error) {
            console.error("Erro login token:", error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    }
    static async generateToken(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'ID de utilizador necessário.' });
            }
            // Verificar se o utilizador existe e se é OPERADOR
            const userToCheck = await prisma_1.prisma.user.findUnique({
                where: { id }
            });
            if (!userToCheck) {
                return res.status(404).json({ error: 'Utilizador não encontrado.' });
            }
            if (userToCheck.role !== 'OPERADOR') {
                return res.status(400).json({ error: 'Apenas operadores podem ter token de acesso rápido.' });
            }
            // Gerar e Atualizar o token
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