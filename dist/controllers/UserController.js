"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
class UserController {
    static async create(req, res) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar usuários.' });
        }
        try {
            const { nome, email, password, matricula, role } = req.body;
            if (role === 'ADMIN') {
                return res.status(403).json({ error: 'Não é permitido criar outro ADMIN por esta rota.' });
            }
            if (!nome || !email || !password || !role) {
                return res.status(400).json({ error: 'Nome, email, password e role são obrigatórios.' });
            }
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash(password, salt);
            const novoUser = await prisma_1.prisma.user.create({
                data: { nome, email, password: hashedPassword, matricula, role },
            });
            // Remove a senha do retorno (segurança)
            const { password: _, ...userSemSenha } = novoUser;
            res.status(201).json(userSemSenha);
        }
        catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: `Já existe um usuário com este email ou matrícula.` });
            }
            res.status(500).json({ error: 'Erro ao registrar usuário' });
        }
    }
    static async list(req, res) {
        try {
            const users = await prisma_1.prisma.user.findMany({
                select: { id: true, nome: true, email: true, role: true, matricula: true },
                orderBy: { nome: 'asc' }
            });
            res.json(users);
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao listar usuários' });
        }
    }
    static async getById(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado.' });
        const id = req.params.id; // Pega diretamente
        if (!id)
            return res.status(400).json({ error: 'ID não fornecido.' });
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id }, // O TypeScript agora entende que id é string devido à verificação acima
                select: { id: true, nome: true, email: true, role: true, matricula: true }
            });
            if (!user)
                return res.status(404).json({ error: 'Usuário não encontrado' });
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar usuário' });
        }
    }
    static async update(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado.' });
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ error: 'ID não fornecido.' });
        try {
            const { nome, email, matricula, role, password } = req.body;
            const data = { nome, email, matricula: matricula || null, role };
            if (password && password.trim() !== '') {
                const salt = await bcrypt_1.default.genSalt(10);
                data.password = await bcrypt_1.default.hash(password, 10);
            }
            const updated = await prisma_1.prisma.user.update({
                where: { id },
                data,
                select: { id: true, nome: true, email: true, role: true, matricula: true }
            });
            res.json(updated);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ error: 'Email ou matrícula já existentes.' });
            }
            res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }
    }
    static async delete(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado.' });
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ error: 'ID não fornecido.' });
        if (req.user?.userId === id)
            return res.status(400).json({ error: 'Não pode remover a si mesmo.' });
        try {
            await prisma_1.prisma.user.delete({ where: { id } });
            res.json({ message: 'Usuário removido' });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
                return res.status(409).json({ error: 'Não é possível remover: Usuário possui registos vinculados.' });
            }
            res.status(500).json({ error: 'Erro ao remover usuário.' });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map