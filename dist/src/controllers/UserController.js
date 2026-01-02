"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserController {
    /**
     * Cria um novo utilizador.
     */
    create = async (req, res, next) => {
        try {
            // 1. Validação de Permissão Básica
            const currentUserRole = req.user?.role || '';
            if (!['ADMIN', 'RH'].includes(currentUserRole)) {
                res.status(403).json({ error: 'Acesso não autorizado.' });
                return;
            }
            const dados = req.body;
            // 2. Regras de Hierarquia
            if (currentUserRole === 'RH' && dados.role === 'ADMIN') {
                res.status(403).json({ error: 'RH não pode criar usuários Administradores.' });
                return;
            }
            if (dados.role === 'ADMIN' && currentUserRole !== 'ADMIN') {
                res.status(403).json({ error: 'Apenas ADMIN pode criar outro ADMIN.' });
                return;
            }
            // 3. Hash da Senha
            const salt = await bcrypt_1.default.genSalt(10);
            const hashedPassword = await bcrypt_1.default.hash(dados.password, salt);
            // 4. Criação no Banco (CORRIGIDO: Usa profile aninhado)
            const novoUser = await prisma_1.prisma.user.create({
                data: {
                    // Dados da tabela USER
                    nome: dados.nome,
                    email: dados.email,
                    password: hashedPassword,
                    role: dados.role || 'OPERADOR',
                    matricula: dados.matricula ?? null,
                    fotoUrl: dados.fotoUrl ?? null,
                    cargoId: dados.cargoId ?? null,
                    // Dados da tabela COLABORADOR_PROFILE (Nested Write)
                    profile: {
                        create: {
                            cnhNumero: dados.cnhNumero ?? null,
                            cnhCategoria: dados.cnhCategoria ?? null,
                            cnhValidade: dados.cnhValidade ? new Date(dados.cnhValidade) : null,
                            dataAdmissao: dados.dataAdmissao ? new Date(dados.dataAdmissao) : null,
                        }
                    }
                },
                include: {
                    profile: true // Retorna o perfil criado para confirmação
                }
            });
            // 5. Retorno Seguro (Sem senha)
            const { password: _, ...userSemSenha } = novoUser;
            res.status(201).json(userSemSenha);
        }
        catch (error) {
            next(error);
        }
    };
    list = async (req, res, next) => {
        try {
            const users = await prisma_1.prisma.user.findMany({
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    role: true,
                    matricula: true,
                    fotoUrl: true,
                    loginToken: true, // [CORREÇÃO] Adicionado para o QR Code aparecer na lista
                    cargo: { select: { nome: true } }
                },
                orderBy: { nome: 'asc' }
            });
            res.json(users);
        }
        catch (error) {
            next(error);
        }
    };
    getById = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID não fornecido.' });
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id },
                include: {
                    cargo: true,
                    profile: true // Inclui dados sensíveis (CNH, Admissão)
                }
            });
            if (!user) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            const { password, ...userSafe } = user;
            res.json(userSafe);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const currentUserRole = req.user?.role || '';
            if (!['ADMIN', 'RH'].includes(currentUserRole)) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID não fornecido.' });
                return;
            }
            const { nome, email, matricula, role, password, cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao, fotoUrl } = req.body;
            // Segurança: RH vs ADMIN
            if (currentUserRole === 'RH') {
                const alvo = await prisma_1.prisma.user.findUnique({ where: { id }, select: { role: true } });
                if (alvo?.role === 'ADMIN') {
                    res.status(403).json({ error: 'RH não pode alterar dados de um Administrador.' });
                    return;
                }
                if (role === 'ADMIN') {
                    res.status(403).json({ error: 'RH não pode promover usuários a Administrador.' });
                    return;
                }
            }
            // Preparar objeto de update para o USUÁRIO (Apenas campos da tabela User)
            const dataToUpdateUser = {
                nome,
                email,
                role,
                matricula: matricula || null,
                fotoUrl: fotoUrl || null,
                cargoId: cargoId || null,
            };
            // Se tiver senha nova
            if (password && password.trim() !== '') {
                dataToUpdateUser.password = await bcrypt_1.default.hash(password, 10);
            }
            // Limpa undefined
            Object.keys(dataToUpdateUser).forEach(key => dataToUpdateUser[key] === undefined && delete dataToUpdateUser[key]);
            // Dados para o PERFIL (ColaboradorProfile)
            const profileData = {
                cnhNumero: cnhNumero || null,
                cnhCategoria: cnhCategoria || null,
                cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
            };
            // Executa o Update com Nested Update no Profile
            const updated = await prisma_1.prisma.user.update({
                where: { id },
                data: {
                    ...dataToUpdateUser,
                    // Lógica inteligente para o Perfil:
                    // Se o usuário já tem perfil, atualiza. Se não tem (ex: Admin antigo), cria.
                    profile: {
                        upsert: {
                            create: profileData,
                            update: profileData
                        }
                    }
                },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    role: true,
                    matricula: true,
                    fotoUrl: true,
                    loginToken: true, // [CORREÇÃO] Adicionado para manter o token após edição
                    profile: true // Retorna o perfil atualizado
                }
            });
            res.json(updated);
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            const currentUserRole = req.user?.role || '';
            if (!['ADMIN', 'RH'].includes(currentUserRole)) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID não fornecido.' });
                return;
            }
            if (req.user?.userId === id) {
                res.status(400).json({ error: 'Não pode remover a si mesmo.' });
                return;
            }
            if (currentUserRole === 'RH') {
                const alvo = await prisma_1.prisma.user.findUnique({ where: { id }, select: { role: true } });
                if (alvo?.role === 'ADMIN') {
                    res.status(403).json({ error: 'RH não pode remover um Administrador.' });
                    return;
                }
            }
            await prisma_1.prisma.user.delete({ where: { id } });
            res.json({ message: 'Usuário removido com sucesso' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map