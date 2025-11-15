"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ================== FUNÇÃO HELPER ==================
// Adiciona dias a uma data (para calcular o limite do alerta)
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
// Instancia o Prisma Client
const prisma = new client_1.PrismaClient();
// Inicializa o Express
const app = (0, express_1.default)();
const port = 3001;
// Middlewares Globais
app.use(express_1.default.json());
// ================== CONFIGURAÇÃO DE CORS (PRODUÇÃO) ==================
// Lista de URLs que podem fazer pedidos à sua API
const whiteList = [
    'http://localhost:5173',
    'https://frontend-frota-2l0kp210m-alissons-projects-e136c5ab.vercel.app',
    'https://frontend-frota-ioc2w8xrs-alissons-projects-e136c5ab.vercel.app',
    'https://frontend-frota.vercel.app'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || whiteList.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
// --- (INÍCIO DA CONFIGURAÇÃO DE UPLOAD) ---
// Define o caminho absoluto para a pasta 'uploads'
// __dirname é 'backend/src', '..' sobe para 'backend/', e 'uploads' entra na pasta
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
// 1. Cria a pasta 'uploads' se ela não existir
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// 2. Serve os ficheiros da pasta 'uploads' estaticamente
// (Ex: http://localhost:3001/uploads/nome_do_ficheiro.jpg)
app.use('/uploads', express_1.default.static(uploadsDir));
// 3. Configura o Multer (onde e como guardar os ficheiros)
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Guarda os ficheiros na pasta 'uploads/'
    },
    filename: (req, file, cb) => {
        // Cria um nome de ficheiro único (Timestamp + nome original)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'foto-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage: storage });
const TOKEN_SECRET = 'SEGREDO_TEMPORARIO_PARA_TESTES';
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        console.log('Middleware: Token não encontrado');
        return res.sendStatus(401);
    }
    jsonwebtoken_1.default.verify(token, TOKEN_SECRET, (err, user) => {
        if (err) {
            console.log('Middleware: Token inválido ou expirado', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
            }
            return res.sendStatus(403);
        }
        req.user = user;
        console.log('Middleware: Token verificado, usuário:', req.user);
        next();
    });
};
// --- FIM DAS DEFINIÇÕES DE AUTENTICAÇÃO ---
// ================== (KM LÓGICO) ==================
// Esta função busca o MAIOR KM registado para um veículo em TODAS as tabelas.
async function getUltimoKMRegistrado(veiculoId) {
    try {
        // 1. Busca o maior KM de Jornada (kmFim)
        const ultimaJornada = await prisma.jornada.findFirst({
            where: { veiculoId: veiculoId, kmFim: { not: null } },
            orderBy: { kmFim: 'desc' },
            select: { kmFim: true }
        });
        // 2. Busca o maior KM de Abastecimento
        const ultimoAbastecimento = await prisma.abastecimento.findFirst({
            where: { veiculoId: veiculoId },
            orderBy: { kmOdometro: 'desc' },
            select: { kmOdometro: true }
        });
        // 3. Busca o maior KM de Ordem de Serviço
        const ultimaOS = await prisma.ordemServico.findFirst({
            where: { veiculoId: veiculoId },
            orderBy: { kmAtual: 'desc' },
            select: { kmAtual: true }
        });
        // 4. Compara os três e retorna o maior de todos
        const maxKmJornada = ultimaJornada?.kmFim ?? 0;
        const maxKmAbastecimento = ultimoAbastecimento?.kmOdometro ?? 0;
        const maxKmOS = ultimaOS?.kmAtual ?? 0;
        return Math.max(maxKmJornada, maxKmAbastecimento, maxKmOS);
    }
    catch (error) {
        console.error("Erro ao buscar último KM:", error);
        return 0; // Retorna 0 em caso de erro
    }
}
/* =========================================
 * ROTAS PÚBLICAS (Login/Register)
 * ========================================= */
// Rota de Registro
app.post('/api/user/register', authenticateToken, async (req, res) => {
    // ================== (AUTORIZAÇÃO) ==================
    // Apenas um Admin pode criar novos usuários
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem registar usuários.' });
    }
    try {
        const { nome, email, password, matricula, role } = req.body;
        // ================== (AUTORIZAÇÃO) ==================
        // Impede que um Admin crie outro Admin por esta rota (conforme UI)
        if (role === 'ADMIN') {
            return res.status(403).json({ error: 'Não é permitido criar outro ADMIN por esta rota.' });
        }
        if (!nome || !email || !password || !role) {
            return res.status(400).json({ error: 'Nome, email, password e role são obrigatórios.' });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(password, salt);
        const novoUser = await prisma.user.create({
            data: {
                nome,
                email,
                password: hashedPassword,
                matricula,
                role,
            },
        });
        const { password: _, ...userSemSenha } = novoUser;
        res.status(201).json(userSemSenha);
    }
    catch (error) {
        console.error("Erro /register:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const target = error.meta?.target?.join(', ');
            return res.status(409).json({ error: `Já existe um usuário com este ${target}.` });
        }
        res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
});
// Rota de Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e password são obrigatórios' });
        }
        const user = await prisma.user.findUnique({
            where: { email: email },
        });
        if (!user) {
            console.log(`Tentativa de login falhou: Email ${email} não encontrado.`);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const senhaCorreta = await bcrypt_1.default.compare(password, user.password);
        if (!senhaCorreta) {
            console.log(`Tentativa de login falhou: Senha incorreta para ${email}.`);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, TOKEN_SECRET, { expiresIn: '8h' });
        res.status(200).json({
            message: 'Login bem-sucedido!',
            token: token,
            user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
        });
    }
    catch (error) {
        console.error("Erro interno /login:", error);
        res.status(500).json({ error: 'Erro interno ao tentar fazer login' });
    }
});
/* =========================================
 * ROTAS PROTEGIDAS
 * ========================================= */
// --- (INÍCIO DA NOVA ROTA DE UPLOAD) ---
app.post('/api/upload', authenticateToken, upload.single('fotoOdometro'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`Ficheiro ${req.file.filename} guardado. URL: ${fileUrl}`);
    res.status(201).json({ url: fileUrl });
});
// --- (FIM DA NOVA ROTA DE UPLOAD) ---
// --- PRODUTOS ---
app.post('/api/produto', authenticateToken, async (req, res) => {
    // ================== CORREÇÃO DE SEGURANÇA (AUTORIZAÇÃO) ==================
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar produtos.' });
    }
    // ================== FIM DA CORREÇÃO ==================
    try {
        const { nome, tipo, unidadeMedida } = req.body;
        if (!nome || !tipo)
            return res.status(400).json({ error: 'Nome e Tipo são obrigatórios' });
        if (!(tipo in client_1.TipoProduto)) {
            return res.status(400).json({ error: `Tipo inválido. Valores aceitos: ${Object.values(client_1.TipoProduto).join(', ')}` });
        }
        const novoProduto = await prisma.produto.create({
            data: { nome, tipo, unidadeMedida: unidadeMedida || 'Litro' },
        });
        res.status(201).json(novoProduto);
    }
    catch (error) {
        console.error("Erro POST /produto:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: `Um produto com o nome '${req.body.nome}' já existe.` });
        }
        res.status(500).json({ error: 'Erro ao cadastrar produto' });
    }
});
app.get('/api/produtos', authenticateToken, async (req, res) => {
    try {
        const produtos = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
        res.status(200).json(produtos);
    }
    catch (error) {
        console.error("Erro GET /produtos:", error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});
// --- FORNECEDORES ---
app.post('/api/fornecedor', authenticateToken, async (req, res) => {
    // ================== CORREÇÃO DE SEGURANÇA (AUTORIZAÇÃO) ==================
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar fornecedores.' });
    }
    // ================== FIM DA CORREÇÃO ==================
    try {
        const { nome, cnpj } = req.body;
        if (!nome)
            return res.status(400).json({ error: 'Nome é obrigatório' });
        const novoFornecedor = await prisma.fornecedor.create({
            data: { nome, cnpj },
        });
        res.status(201).json(novoFornecedor);
    }
    catch (error) {
        console.error("Erro POST /fornecedor:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const target = error.meta?.target?.join(', ');
            return res.status(409).json({ error: `Já existe um fornecedor com este ${target}.` });
        }
        res.status(500).json({ error: 'Erro ao cadastrar fornecedor' });
    }
});
app.get('/api/fornecedores', authenticateToken, async (req, res) => {
    try {
        const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
        res.status(200).json(fornecedores);
    }
    catch (error) {
        console.error("Erro GET /fornecedores:", error);
        res.status(500).json({ error: 'Erro ao buscar fornecedores' });
    }
});
// --- USUÁRIOS ---
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, nome: true, email: true, role: true, matricula: true },
            orderBy: { nome: 'asc' }
        });
        res.status(200).json(users);
    }
    catch (error) {
        console.error("Erro GET /users:", error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});
// --- VEÍCULOS ---
app.post('/api/veiculo', authenticateToken, async (req, res) => {
    // ================== CORREÇÃO DE SEGURANÇA (AUTORIZAÇÃO) ==================
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar veículos.' });
    }
    // ================== FIM DA CORREÇÃO ==================
    try {
        const { placa, modelo, ano, tipoCombustivel, capacidadeTanque, tipoVeiculo, vencimentoCiv, vencimentoCipp } = req.body;
        if (!placa || !modelo || !ano) {
            return res.status(400).json({ error: 'Placa, modelo e ano são obrigatórios' });
        }
        const novoVeiculo = await prisma.veiculo.create({
            data: {
                placa: placa.toUpperCase(),
                modelo,
                ano: parseInt(ano),
                tipoCombustivel: tipoCombustivel || 'DIESEL_S10',
                capacidadeTanque: capacidadeTanque ? parseFloat(capacidadeTanque) : null,
                tipoVeiculo: tipoVeiculo || null,
                vencimentoCiv: vencimentoCiv ? new Date(vencimentoCiv) : null,
                vencimentoCipp: vencimentoCipp ? new Date(vencimentoCipp) : null,
            },
        });
        res.status(201).json(novoVeiculo);
    }
    catch (error) {
        console.error("Erro POST /veiculo:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: `Veículo com placa ${req.body.placa} já existe.` });
        }
        res.status(500).json({ error: 'Erro ao cadastrar veículo' });
    }
});
app.get('/api/veiculos', authenticateToken, async (req, res) => {
    try {
        const veiculos = await prisma.veiculo.findMany({
            orderBy: { placa: 'asc' }
        });
        res.status(200).json(veiculos);
    }
    catch (error) {
        console.error("Erro GET /veiculos:", error);
        res.status(500).json({ error: 'Erro ao buscar veículos' });
    }
});
// --- ABASTECIMENTO ---
app.post('/api/abastecimento', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Apenas Encarregados ou Admins podem registrar abastecimentos.' });
    }
    try {
        const { veiculoId, operadorId, fornecedorId, kmOdometro, dataHora, placaCartaoUsado, itens, observacoes, justificativa, fotoNotaFiscalUrl } = req.body;
        if (!veiculoId || !operadorId || !fornecedorId || !kmOdometro || !dataHora || !itens || !placaCartaoUsado || !fotoNotaFiscalUrl) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando (Veículo, Operador, Fornecedor, KM, Data, Itens, Cartão e Foto da Nota).' });
        }
        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ error: '"itens" deve ser um array não vazio.' });
        }
        let custoTotalGeral = 0;
        const itensParaCriar = [];
        const kmOdometroFloat = parseFloat(kmOdometro);
        // ================== CORREÇÃO DE INTEGRIDADE (KM LÓGICO) ==================
        // 2. USAR O "SUPER-VERIFICADOR"
        const ultimoKM = await getUltimoKMRegistrado(veiculoId);
        if (kmOdometroFloat < ultimoKM) {
            return res.status(400).json({
                error: `KM do odômetro (${kmOdometroFloat}) é menor que o último KM registado (${ultimoKM}) para este veículo.`
            });
        }
        // ================== FIM DA CORREÇÃO ==================
        for (const item of itens) {
            if (!item.produtoId || !item.quantidade || !item.valorPorUnidade) {
                return res.status(400).json({ error: 'Cada item deve ter produtoId, quantidade e valorPorUnidade.' });
            }
            if (parseFloat(item.quantidade) <= 0 || parseFloat(item.valorPorUnidade) <= 0) {
                return res.status(400).json({ error: 'Quantidade e Valor por Unidade devem ser positivos.' });
            }
            const valorTotalItem = parseFloat(item.quantidade) * parseFloat(item.valorPorUnidade);
            custoTotalGeral += valorTotalItem;
            itensParaCriar.push({
                produtoId: item.produtoId,
                quantidade: parseFloat(item.quantidade),
                valorPorUnidade: parseFloat(item.valorPorUnidade),
                valorTotal: valorTotalItem,
            });
        }
        const novoAbastecimento = await prisma.abastecimento.create({
            data: {
                veiculo: { connect: { id: veiculoId } },
                operador: { connect: { id: operadorId } },
                fornecedor: { connect: { id: fornecedorId } },
                kmOdometro: kmOdometroFloat,
                dataHora: new Date(dataHora),
                custoTotal: custoTotalGeral,
                placaCartaoUsado: placaCartaoUsado,
                observacoes: observacoes || null,
                justificativa: justificativa || null,
                fotoNotaFiscalUrl: fotoNotaFiscalUrl,
                itens: { create: itensParaCriar },
            },
            include: { itens: { include: { produto: true } } },
        });
        console.log(`Abastecimento ${novoAbastecimento.id} registrado por ${req.user?.userId} (${req.user?.role})`);
        res.status(201).json(novoAbastecimento);
    }
    catch (error) {
        console.error("Erro POST /abastecimento:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            const field = error.meta?.field_name?.replace('_id', '');
            return res.status(404).json({ error: `ID inválido fornecido para ${field}. Registro não encontrado.` });
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ error: 'Um dos IDs fornecidos (veiculo, operador, fornecedor) não existe.' });
        }
        res.status(500).json({ error: 'Erro ao registrar abastecimento' });
    }
});
app.get('/api/veiculo/:veiculoId/abastecimentos', authenticateToken, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        if (!veiculoId) {
            return res.status(400).json({ error: 'veiculoId não foi fornecido.' });
        }
        const abastecimentos = await prisma.abastecimento.findMany({
            where: { veiculoId: veiculoId },
            include: {
                itens: { include: { produto: true } },
                operador: { select: { nome: true } },
                fornecedor: { select: { nome: true } },
            },
            orderBy: { dataHora: 'desc' }
        });
        res.status(200).json({
            totalRegistros: abastecimentos.length,
            registros: abastecimentos
        });
    }
    catch (error) {
        console.error("Erro GET /:veiculoId/abastecimentos:", error);
        res.status(500).json({ error: 'Erro ao buscar abastecimentos' });
    }
});
// --- MANUTENÇÃO (ORDEM DE SERVIÇO) ---
app.post('/api/ordem-servico', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Apenas Encarregados ou Admins podem registrar manutenções.' });
    }
    const encarregadoId = req.user?.userId;
    try {
        const { veiculoId, fornecedorId, kmAtual, data, tipo, itens, observacoes, fotoComprovanteUrl } = req.body;
        if (!veiculoId || !fornecedorId || !kmAtual || !data || !tipo || !itens || !fotoComprovanteUrl) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando (Veículo, Oficina/Lavagem, KM, Data, Tipo, Itens e Foto).' });
        }
        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ error: '"itens" deve ser um array não vazio (Ex: "Lavagem Completa" ou "Troca de Óleo").' });
        }
        let custoTotalGeral = 0;
        const itensParaCriar = [];
        const kmAtualFloat = parseFloat(kmAtual);
        // ================== CORREÇÃO DE INTEGRIDADE (KM LÓGICO) ==================
        // 3. USAR O "SUPER-VERIFICADOR"
        const ultimoKM = await getUltimoKMRegistrado(veiculoId);
        if (kmAtualFloat < ultimoKM) {
            return res.status(400).json({
                error: `KM Atual (${kmAtualFloat}) é menor que o último KM registado (${ultimoKM}) para este veículo.`
            });
        }
        // ================== FIM DA CORREÇÃO ==================
        for (const item of itens) {
            if (!item.produtoId || !item.quantidade || !item.valorPorUnidade) {
                return res.status(400).json({ error: 'Cada item deve ter produtoId, quantidade e valorPorUnidade.' });
            }
            if (parseFloat(item.quantidade) <= 0 || parseFloat(item.valorPorUnidade) < 0) {
                return res.status(400).json({ error: 'Quantidade deve ser positiva e Valor por Unidade não pode ser negativo.' });
            }
            const valorTotalItem = parseFloat(item.quantidade) * parseFloat(item.valorPorUnidade);
            custoTotalGeral += valorTotalItem;
            itensParaCriar.push({
                produtoId: item.produtoId,
                quantidade: parseFloat(item.quantidade),
                valorPorUnidade: parseFloat(item.valorPorUnidade),
                valorTotal: valorTotalItem,
            });
        }
        const novaOrdemServico = await prisma.ordemServico.create({
            data: {
                veiculo: { connect: { id: veiculoId } },
                fornecedor: { connect: { id: fornecedorId } },
                encarregado: { connect: { id: encarregadoId } },
                kmAtual: kmAtualFloat,
                data: new Date(data),
                tipo: tipo,
                custoTotal: custoTotalGeral,
                observacoes: observacoes || null,
                fotoComprovanteUrl: fotoComprovanteUrl,
                itens: { create: itensParaCriar },
            },
            include: {
                itens: { include: { produto: true } },
                veiculo: { select: { placa: true } },
                fornecedor: { select: { nome: true } }
            },
        });
        console.log(`Ordem de Serviço ${novaOrdemServico.id} registrada por ${encarregadoId} (${req.user?.role})`);
        res.status(201).json(novaOrdemServico);
    }
    catch (error) {
        console.error("Erro POST /api/ordem-servico:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2025')) {
            const field = error.meta?.field_name?.replace('_id', '');
            return res.status(404).json({ error: `ID inválido fornecido para ${field}. Registro não encontrado.` });
        }
        res.status(500).json({ error: 'Erro ao registrar Ordem de Serviço' });
    }
});
// --- JORNADAS ---
app.post('/api/jornada/iniciar', authenticateToken, async (req, res) => {
    try {
        const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body;
        const operadorId = req.user?.userId;
        if (!veiculoId || !operadorId || !encarregadoId || !kmInicio) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando (Veículo, Encarregado, KM Inicial).' });
        }
        if (!fotoInicioUrl) {
            return res.status(400).json({ error: 'A foto do odómetro de início é obrigatória.' });
        }
        const kmInicioFloat = parseFloat(kmInicio);
        if (isNaN(kmInicioFloat) || kmInicioFloat < 0) {
            return res.status(400).json({ error: 'KM Inicial inválido.' });
        }
        const dataInicioAtual = new Date();
        // ================== CORREÇÃO DE INTEGRIDADE (KM LÓGICO) ==================
        // 4. USAR O "SUPER-VERIFICADOR"
        const ultimoKM = await getUltimoKMRegistrado(veiculoId);
        if (kmInicioFloat < ultimoKM) {
            return res.status(400).json({
                error: `KM Inicial (${kmInicioFloat}) é menor que o último KM registado (${ultimoKM}) para este veículo.`
            });
        }
        // ================== FIM DA CORREÇÃO ==================
        // Lógica de Auto-KM Fim (Regra A) - Esta lógica está correta e deve ser mantida
        // Ela procura por jornadas *não finalizadas* para fechar
        const ultimaJornadaVeiculo = await prisma.jornada.findFirst({
            where: { veiculoId: veiculoId, kmFim: null },
            orderBy: { dataInicio: 'desc' },
        });
        let updateUltimaJornadaVeiculo = null;
        if (ultimaJornadaVeiculo) {
            if (kmInicioFloat < ultimaJornadaVeiculo.kmInicio) {
                console.warn(`Auto Preenchimento KM Fim: KM da nova jornada (${kmInicioFloat}) é menor que KM Inicial (${ultimaJornadaVeiculo.kmInicio}) da jornada ${ultimaJornadaVeiculo.id}. Preenchendo mesmo assim.`);
            }
            console.log(`Preenchendo KM Fim da jornada ${ultimaJornadaVeiculo.id} com ${kmInicioFloat}`);
            updateUltimaJornadaVeiculo = prisma.jornada.update({
                where: { id: ultimaJornadaVeiculo.id },
                data: { kmFim: kmInicioFloat, dataFim: new Date() },
            });
        }
        // Cria a Nova Jornada
        const createNovaJornada = prisma.jornada.create({
            data: {
                veiculo: { connect: { id: veiculoId } },
                operador: { connect: { id: operadorId } },
                encarregado: { connect: { id: encarregadoId } },
                dataInicio: dataInicioAtual,
                kmInicio: kmInicioFloat,
                observacoes: observacoes,
                fotoInicioUrl: fotoInicioUrl,
            },
            include: {
                veiculo: { select: { placa: true, modelo: true } },
                encarregado: { select: { nome: true } },
            }
        });
        // Executa em Transação
        let resultadoTransacao;
        if (updateUltimaJornadaVeiculo) {
            resultadoTransacao = await prisma.$transaction([updateUltimaJornadaVeiculo, createNovaJornada]);
        }
        else {
            resultadoTransacao = await prisma.$transaction([createNovaJornada]);
        }
        const novaJornadaCriada = resultadoTransacao[resultadoTransacao.length - 1];
        console.log(`Jornada ${novaJornadaCriada.id} iniciada por ${operadorId}`);
        res.status(201).json(novaJornadaCriada);
    }
    catch (error) {
        console.error("Erro POST /jornada/iniciar:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            const field = error.meta?.field_name?.replace('_id', '');
            return res.status(404).json({ error: `ID inválido fornecido para ${field}. Registro não encontrado.` });
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ error: 'ID do Veículo ou Encarregado não encontrado.' });
        }
        res.status(500).json({ error: 'Erro ao iniciar jornada' });
    }
});
// Finalizar Jornada (Operador ou Encarregado/Admin)
// (Esta rota já estava correta, pois o KM de finalização é comparado com o de início)
app.put('/api/jornada/finalizar/:jornadaId', authenticateToken, async (req, res) => {
    try {
        const { jornadaId } = req.params;
        const userId = req.user?.userId;
        if (!jornadaId) {
            return res.status(400).json({ error: 'jornadaId não fornecido.' });
        }
        const { kmFim, observacoes, fotoFimUrl } = req.body;
        if (!kmFim) {
            return res.status(400).json({ error: 'kmFim é obrigatório.' });
        }
        if (!fotoFimUrl && req.user?.role === 'OPERADOR') {
            return res.status(400).json({ error: 'A foto do odómetro de fim é obrigatória.' });
        }
        const kmFimFloat = parseFloat(kmFim);
        if (isNaN(kmFimFloat) || kmFimFloat < 0) {
            return res.status(400).json({ error: 'KM Final inválido.' });
        }
        const dataFimAtual = new Date();
        const jornadaExistente = await prisma.jornada.findUnique({
            where: { id: jornadaId },
        });
        if (!jornadaExistente) {
            return res.status(404).json({ error: `Jornada ${jornadaId} não encontrada.` });
        }
        if (jornadaExistente.operadorId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            console.log(`Tentativa não autorizada: User ${userId} (${req.user?.role}) tentando finalizar jornada ${jornadaId} do operador ${jornadaExistente.operadorId}`);
            return res.status(403).json({ error: 'Você não tem permissão para finalizar esta jornada.' });
        }
        if (jornadaExistente.kmFim !== null) {
            return res.status(400).json({ error: `Jornada ${jornadaId} já finalizada.` });
        }
        // ================== CORREÇÃO DE INTEGRIDADE (KM LÓGICO) ==================
        // 5. USAR O "SUPER-VERIFICADOR" (Mesmo ao finalizar)
        // Garantir que o KM final não é menor que o último KM mestre (de outro evento)
        const ultimoKM = await getUltimoKMRegistrado(jornadaExistente.veiculoId);
        if (kmFimFloat < ultimoKM && ultimoKM > jornadaExistente.kmInicio) {
            return res.status(400).json({
                error: `Atenção: O KM Final (${kmFimFloat}) é menor que o último KM registado (${ultimoKM}) em outro evento (Abastecimento/Manutenção). Corrija o valor.`
            });
        }
        // Verificação interna (esta já existia e está correta)
        if (kmFimFloat < jornadaExistente.kmInicio) {
            return res.status(400).json({ error: `Atenção: A jornada começou com ${jornadaExistente.kmInicio} KM. O KM Final (${kmFimFloat}) precisa ser um número MAIOR. Por favor, corrija o valor.` });
        }
        // ================== FIM DA CORREÇÃO ==================
        const proximaJornada = await prisma.jornada.findFirst({
            where: { veiculoId: jornadaExistente.veiculoId, dataInicio: { gt: jornadaExistente.dataInicio } },
            orderBy: { dataInicio: 'asc' }
        });
        if (proximaJornada && kmFimFloat > proximaJornada.kmInicio) {
            return res.status(400).json({ error: `KM Final (${kmFimFloat}) não pode ser maior que o KM Inicial (${proximaJornada.kmInicio}) da jornada seguinte (ID: ${proximaJornada.id}).` });
        }
        const jornadaFinalizada = await prisma.jornada.update({
            where: { id: jornadaId },
            data: {
                dataFim: dataFimAtual,
                kmFim: kmFimFloat,
                observacoes: observacoes,
                fotoFimUrl: fotoFimUrl || null,
            },
        });
        console.log(`Jornada ${jornadaId} finalizada por ${userId} (${req.user?.role})`);
        res.status(200).json(jornadaFinalizada);
    }
    catch (error) {
        console.error("Erro PUT /jornada/finalizar:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ error: `Jornada com ID ${req.params?.jornadaId} não encontrada.` });
        }
        res.status(500).json({ error: 'Erro ao finalizar jornada' });
    }
});
// Buscar Jornadas Abertas (Apenas Encarregado/Admin)
app.get('/api/jornadas/abertas', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    try {
        const jornadasAbertas = await prisma.jornada.findMany({
            where: { kmFim: null },
            include: {
                veiculo: { select: { placa: true, modelo: true } },
                operador: { select: { nome: true } },
            },
            orderBy: { dataInicio: 'desc' },
        });
        res.status(200).json(jornadasAbertas);
    }
    catch (error) {
        console.error("Erro GET /jornadas/abertas:", error);
        res.status(500).json({ error: 'Erro ao buscar jornadas em aberto' });
    }
});
// ROTA ATUALIZADA (Regra C: Timeout de 17h)
app.get('/api/jornadas/minhas-abertas-operador', authenticateToken, async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    try {
        const jornadasAbertasOperador = await prisma.jornada.findMany({
            where: { operadorId: userId, kmFim: null },
            include: {
                veiculo: { select: { placa: true, modelo: true } },
                encarregado: { select: { nome: true } },
            },
            orderBy: { dataInicio: 'desc' }
        });
        const agora = new Date();
        const jornadasAtivasValidas = [];
        const updatesBatch = [];
        for (const jornada of jornadasAbertasOperador) {
            const inicioJornada = new Date(jornada.dataInicio);
            const horasPassadas = (agora.getTime() - inicioJornada.getTime()) / (1000 * 60 * 60);
            if (horasPassadas > 17) {
                console.log(`[GET /minhas-abertas] Fechando automaticamente a jornada ${jornada.id} por tempo limite de 17h.`);
                updatesBatch.push(prisma.jornada.update({
                    where: { id: jornada.id },
                    data: {
                        kmFim: jornada.kmInicio,
                        dataFim: agora,
                        observacoes: (jornada.observacoes || '') + ' [Fechada automaticamente por tempo limite (17h).]'
                    }
                }));
            }
            else {
                jornadasAtivasValidas.push(jornada);
            }
        }
        if (updatesBatch.length > 0) {
            await prisma.$transaction(updatesBatch);
        }
        res.status(200).json(jornadasAtivasValidas);
    }
    catch (error) {
        console.error("Erro GET /jornadas/minhas-abertas-operador:", error);
        res.status(500).json({ error: 'Erro ao buscar jornadas ativas' });
    }
});
// --- RELATÓRIOS ---
app.get('/api/relatorio/consumo/:veiculoId', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    try {
        const { veiculoId } = req.params;
        if (!veiculoId) {
            return res.status(400).json({ error: 'veiculoId não fornecido.' });
        }
        const abastecimentos = await prisma.abastecimento.findMany({
            where: { veiculoId: veiculoId },
            orderBy: { kmOdometro: 'asc' },
        });
        if (abastecimentos.length < 2) {
            return res.status(400).json({ message: 'Dados insuficientes (mínimo 2 abastecimentos).' });
        }
        const kmInicial = abastecimentos[0].kmOdometro;
        const kmFinal = abastecimentos[abastecimentos.length - 1].kmOdometro;
        const totalKMRodado = kmFinal - kmInicial;
        if (totalKMRodado <= 0) {
            return res.status(400).json({ message: 'KM rodado inválido (KM Final <= KM Inicial nos abastecimentos).' });
        }
        const agregacaoLitrosCorreta = await prisma.itemAbastecimento.aggregate({
            _sum: { quantidade: true },
            where: {
                abastecimento: {
                    veiculoId: veiculoId,
                    kmOdometro: { gt: kmInicial }
                },
                produto: { tipo: 'COMBUSTIVEL' },
            },
        });
        const totalLitrosConsumidos = agregacaoLitrosCorreta._sum.quantidade;
        if (!totalLitrosConsumidos || totalLitrosConsumidos <= 0) {
            return res.status(400).json({ message: 'Nenhum litro de combustível encontrado ou valor inválido no período.' });
        }
        const consumoMedioKML = totalKMRodado / totalLitrosConsumidos;
        res.status(200).json({
            veiculoId: veiculoId,
            consumoMedio_KML: consumoMedioKML.toFixed(2),
            totalKMRodado: totalKMRodado.toFixed(2),
            totalLitrosCombustivel: totalLitrosConsumidos.toFixed(2),
            kmInicialPeriodo: kmInicial,
            kmFinalPeriodo: kmFinal,
            primeiroAbastecimentoData: abastecimentos[0]?.dataHora,
            ultimoAbastecimentoData: abastecimentos[abastecimentos.length - 1]?.dataHora,
            totalAbastecimentosNoPeriodo: abastecimentos.length,
        });
    }
    catch (error) {
        console.error("Erro GET /relatorio/consumo:", error);
        res.status(500).json({ error: 'Erro ao calcular consumo' });
    }
});
app.get('/api/relatorio/custo/:veiculoId', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Acesso não autorizado.' }); // CORRIGIDO
    }
    try {
        const { veiculoId } = req.params;
        if (!veiculoId) {
            return res.status(400).json({ error: 'veiculoId não fornecido.' });
        }
        const abastecimentos = await prisma.abastecimento.findMany({
            where: { veiculoId: veiculoId },
            orderBy: { kmOdometro: 'asc' },
        });
        if (abastecimentos.length < 2) {
            return res.status(400).json({ message: 'Dados insuficientes (mínimo 2 abastecimentos).' });
        }
        const kmInicial = abastecimentos[0].kmOdometro;
        const kmFinal = abastecimentos[abastecimentos.length - 1].kmOdometro;
        const totalKMRodado = kmFinal - kmInicial;
        if (totalKMRodado <= 0) {
            return res.status(400).json({ message: 'KM rodado inválido.' });
        }
        const agregacaoCustosCorreta = await prisma.itemAbastecimento.aggregate({
            _sum: { valorTotal: true },
            where: {
                abastecimento: {
                    veiculoId: veiculoId,
                    kmOdometro: { gt: kmInicial }
                },
            },
        });
        const custoTotalOperacional = agregacaoCustosCorreta._sum.valorTotal;
        if (!custoTotalOperacional || custoTotalOperacional <= 0) {
            return res.status(400).json({ message: 'Nenhum custo operacional encontrado ou valor inválido no período.' });
        }
        const custoPorKm = custoTotalOperacional / totalKMRodado;
        res.status(200).json({
            veiculoId: veiculoId,
            custoPorKm_RS: custoPorKm.toFixed(2),
            custoPorKm_RS_string: `R$ ${custoPorKm.toFixed(2)}`,
            custoTotalOperacional_RS: custoTotalOperacional.toFixed(2),
            custoTotalOperacional_RS_string: `R$ ${custoTotalOperacional.toFixed(2)}`,
            totalKMRodado: totalKMRodado.toFixed(2),
            kmInicialPeriodo: kmInicial,
            kmFinalPeriodo: kmFinal,
            totalAbastecimentosNoPeriodo: abastecimentos.length,
        });
    }
    catch (error) {
        console.error("Erro GET /relatorio/custo:", error);
        res.status(500).json({ error: 'Erro ao calcular custo por km' });
    }
});
// ===================================================================
// PASSO 3 (ATUALIZADO): ROTA DE SUMÁRIO MENSAL (KPIs)
// ===================================================================
app.get('/api/relatorio/sumario', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    try {
        // ================== Ler o veiculoId da query ==================
        const { ano, mes, veiculoId } = req.query;
        // ================== FIM DA MUDANÇA ==================
        // 1. Define o período de filtro (Default: Mês atual)
        const anoAtual = new Date().getFullYear();
        const mesAtual = new Date().getMonth() + 1; // JS month é 0-11
        const anoNum = ano ? parseInt(ano) : anoAtual;
        const mesNum = mes ? parseInt(mes) : mesAtual;
        const dataInicio = new Date(anoNum, mesNum - 1, 1);
        const dataFim = new Date(anoNum, mesNum, 1);
        // ================== Criar os objectos de filtro dinâmicos ==================
        // Filtro de data (para todas as consultas)
        const filtroDataHora = {
            gte: dataInicio,
            lt: dataFim
        };
        // Filtro de veículo (só é adicionado se veiculoId existir)
        const filtroVeiculo = veiculoId ? { veiculoId: veiculoId } : {};
        // ================== FIM DA MUDANÇA ==================
        // 2. KPI: Custos de COMBUSTÍVEL (ex: Diesel)
        const custoCombustivelResult = await prisma.itemAbastecimento.aggregate({
            _sum: { valorTotal: true },
            where: {
                produto: {
                    tipo: 'COMBUSTIVEL'
                },
                abastecimento: {
                    dataHora: filtroDataHora,
                    ...filtroVeiculo
                }
            }
        });
        const custoTotalCombustivel = custoCombustivelResult._sum.valorTotal || 0;
        // 3. KPI: Custos de ADITIVO (ex: Arla32)
        const custoAditivoResult = await prisma.itemAbastecimento.aggregate({
            _sum: { valorTotal: true },
            where: {
                produto: {
                    tipo: 'ADITIVO'
                },
                abastecimento: {
                    dataHora: filtroDataHora,
                    ...filtroVeiculo
                }
            }
        });
        const custoTotalAditivo = custoAditivoResult._sum.valorTotal || 0;
        // 4. KPI: Custos de Manutenção e Lavagem
        const custoManutencaoResult = await prisma.ordemServico.aggregate({
            _sum: { custoTotal: true },
            where: {
                data: filtroDataHora,
                ...filtroVeiculo
            }
        });
        const custoTotalManutencao = custoManutencaoResult._sum.custoTotal || 0;
        // 5. KPI: KM Total Rodado
        const jornadasNoPeriodo = await prisma.jornada.findMany({
            where: {
                dataInicio: filtroDataHora,
                kmFim: {
                    not: null
                },
                ...filtroVeiculo
            },
            select: {
                kmInicio: true,
                kmFim: true
            }
        });
        const kmTotalRodado = jornadasNoPeriodo.reduce((total, jornada) => {
            const kmFim = jornada.kmFim ?? 0;
            const kmInicio = jornada.kmInicio ?? 0;
            if (kmFim > kmInicio) {
                return total + (kmFim - kmInicio);
            }
            return total;
        }, 0);
        // 6. KPI: Litros Totais Consumidos
        const litrosResult = await prisma.itemAbastecimento.aggregate({
            _sum: { quantidade: true },
            where: {
                produto: {
                    tipo: 'COMBUSTIVEL'
                },
                abastecimento: {
                    dataHora: filtroDataHora,
                    ...filtroVeiculo
                }
            }
        });
        const litrosTotaisConsumidos = litrosResult._sum.quantidade || 0;
        // 7. KPIs Derivados
        const custoTotalGeral = custoTotalCombustivel + custoTotalAditivo + custoTotalManutencao;
        const consumoMedioKML = (litrosTotaisConsumidos > 0)
            ? (kmTotalRodado / litrosTotaisConsumidos)
            : 0;
        const custoMedioPorKM = (kmTotalRodado > 0)
            ? (custoTotalGeral / kmTotalRodado)
            : 0;
        // 8. Resposta
        res.status(200).json({
            filtros: {
                ano: anoNum,
                mes: mesNum,
                // ================== Informar o filtro usado ==================
                veiculoId: veiculoId || 'frota_inteira'
            },
            kpis: {
                custoTotalGeral,
                custoTotalCombustivel,
                custoTotalAditivo,
                custoTotalManutencao,
                kmTotalRodado,
                litrosTotaisConsumidos,
                consumoMedioKML,
                custoMedioPorKM
            }
        });
    }
    catch (error) {
        console.error("Erro GET /api/relatorio/sumario:", error);
        res.status(500).json({ error: 'Erro ao calcular sumário' });
    }
});
//  CRUD PARA PLANOS DE MANUTENÇÃO
// --- Criar um novo Plano de Manutenção ---
app.post('/api/plano-manutencao', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas Admins podem criar planos de manutenção.' });
    }
    try {
        const { veiculoId, descricao, tipoIntervalo, valorIntervalo } = req.body;
        if (!veiculoId || !descricao || !tipoIntervalo || !valorIntervalo) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }
        // ================== CORREÇÃO DE INTEGRIDADE (KM LÓGICO) ==================
        // 6. USAR O "SUPER-VERIFICADOR" para definir o próximo alerta
        const kmAtual = await getUltimoKMRegistrado(veiculoId);
        // ================== FIM DA CORREÇÃO ==================
        let kmProximaManutencao = null;
        let dataProximaManutencao = null;
        if (tipoIntervalo === 'KM') {
            kmProximaManutencao = kmAtual + parseFloat(valorIntervalo);
        }
        else if (tipoIntervalo === 'TEMPO') {
            let dataBase = new Date();
            dataProximaManutencao = new Date(dataBase.setMonth(dataBase.getMonth() + parseInt(valorIntervalo)));
        }
        const novoPlano = await prisma.planoManutencao.create({
            data: {
                veiculo: { connect: { id: veiculoId } },
                descricao,
                tipoIntervalo,
                valorIntervalo: parseFloat(valorIntervalo),
                kmProximaManutencao: kmProximaManutencao,
                dataProximaManutencao: dataProximaManutencao,
            },
        });
        res.status(201).json(novoPlano);
    }
    catch (error) {
        console.error("Erro POST /api/plano-manutencao:", error);
        res.status(500).json({ error: 'Erro ao criar plano de manutenção.' });
    }
});
// --- Listar todos os Planos (para a nova aba do Admin) ---
app.get('/api/planos-manutencao', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    try {
        const planos = await prisma.planoManutencao.findMany({
            include: {
                veiculo: { select: { placa: true, modelo: true } } // Inclui a placa
            },
            orderBy: { veiculo: { placa: 'asc' } }
        });
        res.status(200).json(planos);
    }
    catch (error) {
        console.error("Erro GET /api/planos-manutencao:", error);
        res.status(500).json({ error: 'Erro ao buscar planos.' });
    }
});
// --- Deletar um Plano de Manutenção ---
app.delete('/api/plano-manutencao/:id', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas Admins podem deletar planos.' });
    }
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'ID do plano não fornecido.' });
        }
        await prisma.planoManutencao.delete({
            where: { id: id }
        });
        res.status(204).send(); // Sucesso, sem conteúdo
    }
    catch (error) {
        console.error("Erro DELETE /api/plano-manutencao:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ error: 'Plano não encontrado.' });
        }
        res.status(500).json({ error: 'Erro ao deletar plano.' });
    }
});
// ===================================================================
// PASSO 4: API DE ALERTAS PROATIVOS
// ===================================================================
app.get('/api/alertas', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    try {
        const alertas = [];
        const hoje = new Date();
        // --- Definição dos Limites de Alerta ---
        const limiteAlertaDias = 30; // Avisar 30 dias antes
        const dataLimite = addDays(hoje, limiteAlertaDias);
        const limiteAlertaKM = 1500; // Avisar 1500 KM antes
        // ----------------------------------------
        // 1. Alertas de Documentação (CIV / CIPP)
        const veiculosComDocs = await prisma.veiculo.findMany({
            where: {
                OR: [
                    { vencimentoCiv: { lte: dataLimite } },
                    { vencimentoCipp: { lte: dataLimite } },
                ]
            },
            select: { id: true, placa: true, vencimentoCiv: true, vencimentoCipp: true }
        });
        for (const veiculo of veiculosComDocs) {
            if (veiculo.vencimentoCiv && veiculo.vencimentoCiv <= dataLimite) {
                const vencido = veiculo.vencimentoCiv < hoje;
                alertas.push({
                    tipo: 'DOCUMENTO',
                    nivel: vencido ? 'VENCIDO' : 'ATENCAO',
                    mensagem: `CIV do veículo ${veiculo.placa} ${vencido ? 'venceu em' : 'vence em'}: ${veiculo.vencimentoCiv.toLocaleDateString('pt-BR')}.`
                });
            }
            if (veiculo.vencimentoCipp && veiculo.vencimentoCipp <= dataLimite) {
                const vencido = veiculo.vencimentoCipp < hoje;
                alertas.push({
                    tipo: 'DOCUMENTO',
                    nivel: vencido ? 'VENCIDO' : 'ATENCAO',
                    mensagem: `CIPP do veículo ${veiculo.placa} ${vencido ? 'venceu em' : 'vence em'}: ${veiculo.vencimentoCipp.toLocaleDateString('pt-BR')}.`
                });
            }
        }
        // 2. Alertas de Manutenção (KM e TEMPO)
        const planos = await prisma.planoManutencao.findMany({
            include: { veiculo: { select: { placa: true, id: true } } }
        });
        for (const plano of planos) {
            // A. Verificação por TEMPO
            if (plano.tipoIntervalo === 'TEMPO' && plano.dataProximaManutencao && plano.dataProximaManutencao <= dataLimite) {
                const vencido = plano.dataProximaManutencao < hoje;
                alertas.push({
                    tipo: 'MANUTENCAO',
                    nivel: vencido ? 'VENCIDO' : 'ATENCAO',
                    mensagem: `Manutenção por tempo (${plano.descricao}) para ${plano.veiculo.placa} ${vencido ? 'venceu em' : 'vence em'}: ${plano.dataProximaManutencao.toLocaleDateString('pt-BR')}.`
                });
            }
            // B. Verificação por KM
            if (plano.tipoIntervalo === 'KM' && plano.kmProximaManutencao) {
                const kmAtualVeiculo = await getUltimoKMRegistrado(plano.veiculo.id);
                const kmRestante = plano.kmProximaManutencao - kmAtualVeiculo;
                if (kmRestante <= 0) {
                    alertas.push({
                        tipo: 'MANUTENCAO',
                        nivel: 'VENCIDO',
                        mensagem: `Manutenção por KM (${plano.descricao}) para ${plano.veiculo.placa} está VENCIDA (Prevista para ${plano.kmProximaManutencao} KM, veículo está com ${kmAtualVeiculo.toFixed(0)} KM).`
                    });
                }
                else if (kmRestante <= limiteAlertaKM) {
                    alertas.push({
                        tipo: 'MANUTENCAO',
                        nivel: 'ATENCAO',
                        mensagem: `Manutenção por KM (${plano.descricao}) para ${plano.veiculo.placa} vence em ${kmRestante.toFixed(0)} KM (Próxima em ${plano.kmProximaManutencao} KM).`
                    });
                }
            }
        }
        // Ordena os alertas por nível (Vencidos primeiro)
        alertas.sort((a, b) => (a.nivel === 'VENCIDO' ? -1 : 1));
        res.status(200).json(alertas);
    }
    catch (error) {
        console.error("Erro GET /api/alertas:", error);
        res.status(500).json({ error: 'Erro ao buscar alertas.' });
    }
});
// ===================================================================
// PASSO 5: API DE RANKING DE MOTORISTAS (KM/L)
// ===================================================================
app.get('/api/relatorio/ranking-operadores', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
        return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    try {
        const { ano, mes } = req.query;
        // 1. Define o período de filtro (Default: Mês atual)
        const anoAtual = new Date().getFullYear();
        const mesAtual = new Date().getMonth() + 1;
        const anoNum = ano ? parseInt(ano) : anoAtual;
        const mesNum = mes ? parseInt(mes) : mesAtual;
        const dataInicio = new Date(anoNum, mesNum - 1, 1);
        const dataFim = new Date(anoNum, mesNum, 1);
        const filtroDataHora = { gte: dataInicio, lt: dataFim };
        // 2. Calcular KM Total por Operador
        const jornadas = await prisma.jornada.findMany({
            where: {
                dataInicio: filtroDataHora,
                kmFim: { not: null } // Apenas jornadas concluídas
            },
            select: {
                operadorId: true,
                kmInicio: true,
                kmFim: true
            }
        });
        const kmsPorOperador = new Map();
        for (const jornada of jornadas) {
            const kmRodado = (jornada.kmFim ?? 0) - (jornada.kmInicio ?? 0);
            if (kmRodado > 0) {
                const totalAnterior = kmsPorOperador.get(jornada.operadorId) || 0;
                kmsPorOperador.set(jornada.operadorId, totalAnterior + kmRodado);
            }
        }
        // 3. Calcular Litros Totais (COMBUSTIVEL) por Operador
        const itensAbastecidos = await prisma.itemAbastecimento.findMany({
            where: {
                produto: {
                    tipo: 'COMBUSTIVEL'
                },
                abastecimento: {
                    dataHora: filtroDataHora
                }
            },
            select: {
                quantidade: true,
                abastecimento: {
                    select: {
                        operadorId: true
                    }
                }
            }
        });
        const litrosPorOperador = new Map();
        for (const item of itensAbastecidos) {
            const operadorId = item.abastecimento.operadorId;
            const totalAnterior = litrosPorOperador.get(operadorId) || 0;
            litrosPorOperador.set(operadorId, totalAnterior + item.quantidade);
        }
        // 4. Buscar nomes dos Operadores
        const operadores = await prisma.user.findMany({
            where: {
                role: 'OPERADOR'
            },
            select: {
                id: true,
                nome: true
            }
        });
        // 5. Unir tudo, Calcular Média (KM/L) e Ordenar
        const ranking = operadores.map(operador => {
            const totalKM = kmsPorOperador.get(operador.id) || 0;
            const totalLitros = litrosPorOperador.get(operador.id) || 0;
            const kml = (totalLitros > 0) ? (totalKM / totalLitros) : 0;
            return {
                id: operador.id,
                nome: operador.nome,
                totalKM,
                totalLitros,
                kml
            };
        })
            // Filtra motoristas que não tiveram atividade
            .filter(op => op.totalKM > 0 || op.totalLitros > 0)
            // Ordena do melhor (maior KM/L) para o pior
            .sort((a, b) => b.kml - a.kml);
        res.status(200).json(ranking);
    }
    catch (error) {
        console.error("Erro GET /api/relatorio/ranking-operadores:", error);
        res.status(500).json({ error: 'Erro ao calcular ranking de operadores.' });
    }
});
// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando em http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map