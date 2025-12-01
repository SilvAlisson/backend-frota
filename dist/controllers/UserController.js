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
            const { nome, email, password, matricula, role, 
            // Novos campos do RH
            cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao } = req.body;
            if (role === 'ADMIN') {
                return res.status(403).json({ error: 'Não é permitido criar outro ADMIN por esta rota.' });
            }
            if (!nome || !email || !password || !role) {
                return res.status(400).json({ error: 'Nome, email, password e role são obrigatórios.' });
            }
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash(password, salt);
            const novoUser = await prisma_1.prisma.user.create({
                data: {
                    nome,
                    email,
                    password: hashedPassword,
                    matricula: matricula || null,
                    role,
                    // Campos opcionais de RH
                    cargoId: cargoId || null,
                    cnhNumero: cnhNumero || null,
                    cnhCategoria: cnhCategoria || null,
                    cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                    dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
                },
            });
            // Remove a senha do retorno (segurança)
            const { password: _, ...userSemSenha } = novoUser;
            res.status(201).json(userSemSenha);
        }
        catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: `Já existe um usuário com este email, matrícula ou token.` });
            }
            console.error("Erro ao criar usuário:", error);
            res.status(500).json({ error: 'Erro ao registrar usuário' });
        }
    }
    static async list(req, res) {
        try {
            const users = await prisma_1.prisma.user.findMany({
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    role: true,
                    matricula: true,
                    cargo: { select: { nome: true } } // Inclui o nome do cargo na listagem
                },
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
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ error: 'ID não fornecido.' });
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id },
                include: { cargo: true } // Traz os dados do cargo também
            });
            if (!user)
                return res.status(404).json({ error: 'Usuário não encontrado' });
            // Remove a senha antes de enviar
            const { password, ...userSafe } = user;
            res.json(userSafe);
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
            const { nome, email, matricula, role, password, cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao } = req.body;
            const data = {
                nome, email, role,
                matricula: matricula || null,
                cargoId: cargoId || null,
                cnhNumero: cnhNumero || null,
                cnhCategoria: cnhCategoria || null,
                cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
            };
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