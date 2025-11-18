import express, { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient, TipoProduto } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import crypto from 'crypto';


// ================== FUNÇÃO HELPER ==================
// Adiciona dias a uma data (para calcular o limite do alerta)
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Formata um objeto Date para uma string 'YYYY-MM-DD' para inputs HTML
const formatDateToInput = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  // Garante que a data seja tratada como UTC para evitar off-by-one de timezone
  const d = new Date(date);
  const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return dataCorrigida.toISOString().split('T')[0] as string;
};

// Instancia o Prisma Client
const prisma = new PrismaClient();

// Inicializa o Express
const app = express();
const port = 3001;

// Middlewares Globais
app.use(express.json());


// ================== CONFIGURAÇÃO DE CORS (PRODUÇÃO) ==================
// Lista de URLs que podem fazer pedidos à sua API
const whiteList = [
  'http://localhost:5173',
  'https://frontend-frota-2l0kp210m-alissons-projects-e136c5ab.vercel.app',
  'https://frontend-frota-ioc2w8xrs-alissons-projects-e136c5ab.vercel.app',
  'https://frontend-frota.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || whiteList.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// --- DEFINIÇÕES DE AUTENTICAÇÃO ---
interface AuthenticatedRequest extends Request {
  user?: { userId: string; role: string };
}
const TOKEN_SECRET = process.env.TOKEN_SECRET;

// VERIFICAÇÃO DE SEGURANÇA
if (!TOKEN_SECRET) {
  console.error("ERRO CRÍTICO: TOKEN_SECRET não está definido nas variáveis de ambiente!");
  process.exit(1); // Impede o servidor de iniciar sem o segredo
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (token == null) {
    console.log('Middleware: Token não encontrado');
    return res.sendStatus(401);
  }

  jwt.verify(token, TOKEN_SECRET, (err: any, user: any) => {
    if (err) {
       console.log('Middleware: Token inválido ou expirado', err.message);
       if (err.name === 'TokenExpiredError') {
         return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
       }
       return res.sendStatus(403); 
    }
    req.user = user as { userId: string; role: string };
    console.log('Middleware: Token verificado, usuário:', req.user);
    next();
  });
};

// --- FIM DAS DEFINIÇÕES DE AUTENTICAÇÃO ---

// ================== (KM LÓGICO) ==================
// Esta função busca o MAIOR KM registado para um veículo em TODAS as tabelas.
async function getUltimoKMRegistrado(veiculoId: string): Promise<number> {
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

  } catch (error) {
    console.error("Erro ao buscar último KM:", error);
    return 0; // Retorna 0 em caso de erro
  }
}


/* =========================================
 * ROTAS PÚBLICAS (Login/Register)
 * ========================================= */

// Rota de Registro
app.post('/api/user/register', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
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
  } catch (error) {
    console.error("Erro /register:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ');
      return res.status(409).json({ error: `Já existe um usuário com este ${target}.` });
    }
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// Rota de Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
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
    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      console.log(`Tentativa de login falhou: Senha incorreta para ${email}.`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      TOKEN_SECRET,
      { expiresIn: '8h' } 
    );
    res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Erro interno /login:", error);
    res.status(500).json({ error: 'Erro interno ao tentar fazer login' });
  }
});

// Rota de Login por Token (QR Code) - PERMANENTE
app.post('/api/auth/login-token', async (req: Request, res: Response) => {
  const { loginToken } = req.body;
  if (!loginToken) {
    return res.status(400).json({ error: 'Token de login é obrigatório.' });
  }

  try {
    // 1. Encontra um utilizador com esse token.
    // (Sem verificação de expiração, pois é permanente)
    const user = await prisma.user.findFirst({
      where: {
        loginToken: loginToken,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Token inválido ou revogado.' });
    }

    // 2. Gerar o JWT de sessão normal
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      TOKEN_SECRET,
      { expiresIn: '8h' } 
    );

    // 3. Retorna a sessão completa (NÃO apaga o token do banco)
    res.status(200).json({
      message: 'Login por token bem-sucedido!',
      token: token,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    });

  } catch (error) {
     console.error("Erro no login por token:", error);
     res.status(500).json({ error: 'Erro interno ao validar token.' });
  }
});

/* =========================================
 * ROTAS PROTEGIDAS
 * ========================================= */

// --- PRODUTOS ---
app.post('/api/produto', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // ================== (AUTORIZAÇÃO) ==================
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar produtos.' });
  }
  
  try {
    const { nome, tipo, unidadeMedida } = req.body;
    if (!nome || !tipo) return res.status(400).json({ error: 'Nome e Tipo são obrigatórios' });
    if (!(tipo in TipoProduto)) {
      return res.status(400).json({ error: `Tipo inválido. Valores aceitos: ${Object.values(TipoProduto).join(', ')}`});
    }
    const novoProduto = await prisma.produto.create({
      data: { nome, tipo, unidadeMedida: unidadeMedida || 'Litro' },
    });
    res.status(201).json(novoProduto);
  } catch (error) {
    console.error("Erro POST /produto:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: `Um produto com o nome '${req.body.nome}' já existe.` });
    }
    res.status(500).json({ error: 'Erro ao cadastrar produto' });
  }
});

app.get('/api/produtos', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const produtos = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
    res.status(200).json(produtos);
  } catch (error) {
    console.error("Erro GET /produtos:", error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// ================== NOVA ROTA (GET by ID) ==================
app.get('/api/produto/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  
  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do produto é inválido ou não fornecido.' });
  }

  try {
    const produto = await prisma.produto.findUnique({
      where: { id: id },
    });

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    
    res.status(200).json(produto);
  } catch (error) {
    console.error(`Erro GET /api/produto/${id}:`, error);
    res.status(500).json({ error: 'Erro ao buscar dados do produto.' });
  }
});

// ================== ROTA PUT ==================
app.put('/api/produto/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem editar produtos.' });
  }

  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do produto é inválido ou não fornecido.' });
  }

  try {
    const { nome, tipo, unidadeMedida } = req.body;

    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e Tipo são obrigatórios' });
    }
    if (!(tipo in TipoProduto)) {
      return res.status(400).json({ error: `Tipo inválido. Valores aceitos: ${Object.values(TipoProduto).join(', ')}`});
    }

    const updatedProduto = await prisma.produto.update({
      where: { id: id },
      data: {
        nome,
        tipo,
        unidadeMedida: unidadeMedida || 'Litro'
      },
    });
    res.status(200).json(updatedProduto);
  } catch (error) {
    console.error(`Erro PUT /api/produto/${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: `Um produto com o nome '${req.body.nome}' já existe.` });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Produto não encontrado para atualização.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
});

// ================== ROTA DELETE ==================
app.delete('/api/produto/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem remover produtos.' });
  }

  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do produto é inválido ou não fornecido.' });
  }

  try {
    await prisma.produto.delete({
      where: { id: id },
    });
    console.log(`Produto ${id} removido pelo Admin ${req.user.userId}.`);
    res.status(200).json({ message: 'Produto removido com sucesso.' });
  } catch (error) {
    console.error(`Erro DELETE /api/produto/${id}:`, error);
    // Trata erro se o produto tiver registos (itens_abastecimento, itens_os)
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
      return res.status(409).json({ error: 'Este produto não pode ser removido pois está a ser utilizado em abastecimentos ou manutenções.' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao remover produto.' });
  }
});

// --- FORNECEDORES ---
app.post('/api/fornecedor', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // ================== (AUTORIZAÇÃO) ==================
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar fornecedores.' });
  }
  
  try {
    const { nome, cnpj } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novoFornecedor = await prisma.fornecedor.create({
      data: { nome, cnpj },
    });
    res.status(201).json(novoFornecedor);
  } catch (error) {
    console.error("Erro POST /fornecedor:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
       const target = (error.meta?.target as string[])?.join(', ');
      return res.status(409).json({ error: `Já existe um fornecedor com este ${target}.` });
    }
    res.status(500).json({ error: 'Erro ao cadastrar fornecedor' });
  }
});

app.get('/api/fornecedores', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
    res.status(200).json(fornecedores);
  } catch (error) {
    console.error("Erro GET /fornecedores:", error);
    res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
});

// ================== NOVA ROTA (GET by ID) ==================
app.get('/api/fornecedor/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  
  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do fornecedor é inválido ou não fornecido.' });
  }

  try {
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: id },
    });

    if (!fornecedor) {
      return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    }
    
    res.status(200).json(fornecedor);
  } catch (error) {
    console.error(`Erro GET /api/fornecedor/${id}:`, error);
    res.status(500).json({ error: 'Erro ao buscar dados do fornecedor.' });
  }
});

// ================== ROTA PUT ==================
app.put('/api/fornecedor/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem editar fornecedores.' });
  }

  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do fornecedor é inválido ou não fornecido.' });
  }

  try {
    const { nome, cnpj } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const updatedFornecedor = await prisma.fornecedor.update({
      where: { id: id },
      data: {
        nome,
        cnpj: cnpj || null
      },
    });
    res.status(200).json(updatedFornecedor);
  } catch (error) {
    console.error(`Erro PUT /api/fornecedor/${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
       const target = (error.meta?.target as string[])?.join(', ');
      return res.status(409).json({ error: `Já existe um fornecedor com este ${target}.` });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Fornecedor não encontrado para atualização.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar fornecedor.' });
  }
});

// ================== ROTA DELETE ==================
app.delete('/api/fornecedor/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem remover fornecedores.' });
  }

  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do fornecedor é inválido ou não fornecido.' });
  }

  try {
    await prisma.fornecedor.delete({
      where: { id: id },
    });
    console.log(`Fornecedor ${id} removido pelo Admin ${req.user.userId}.`);
    res.status(200).json({ message: 'Fornecedor removido com sucesso.' });
  } catch (error) {
    console.error(`Erro DELETE /api/fornecedor/${id}:`, error);
    // Trata erro se o fornecedor tiver registos (abastecimentos, os)
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
      return res.status(409).json({ error: 'Este fornecedor não pode ser removido pois está a ser utilizado em abastecimentos ou manutenções.' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao remover fornecedor.' });
  }
});

// --- USUÁRIOS ---
app.get('/api/users', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, role: true, matricula: true },
      orderBy: { nome: 'asc' }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro GET /users:", error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Rota para buscar um usuário específico por ID (Admin)
app.get('/api/user/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Autorização
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  const { id } = req.params;

  // ================== CORREÇÃO DO ERRO TS(2375) ==================
  // Adiciona uma verificação para garantir que 'id' é uma string
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do utilizador é inválido ou não fornecido.' });
  }
  // Agora o TypeScript sabe que 'id' é uma string daqui para baixo
  // ================== FIM DA CORREÇÃO ==================

  try {
    const user = await prisma.user.findUnique({
      where: { id: id }, // Erro da linha 302 corrigido
      // 2. Seleciona os campos seguros (exclui a senha)
      select: { id: true, nome: true, email: true, role: true, matricula: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    // 3. Retorna os dados do usuário
    res.status(200).json(user);

  } catch (error) {
    console.error(`Erro ao buscar usuário ${id}:`, error);
    res.status(500).json({ error: 'Erro interno ao buscar usuário.' });
  }
});

// Rota para EDITAR um usuário (Admin)
app.put('/api/user/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Autorização
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  const { id } = req.params;
  const { nome, email, matricula, role, password } = req.body;

  // ================== CORREÇÃO DO ERRO TS(2375) ==================
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do utilizador é inválido ou não fornecido.' });
  }
  // ================== FIM DA CORREÇÃO ==================

  if (!nome || !email || !role) {
    return res.status(400).json({ error: 'Nome, email e função são obrigatórios.' });
  }

  // 2. Preparar os dados
  const dataToUpdate: any = {
  // ... (restante da lógica de preparação de dataToUpdate)
    nome,
    email,
    matricula: matricula || null,
    role,
  };

  // 3. Opcionalmente atualizar a senha (se uma nova foi fornecida)
  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    dataToUpdate.password = await bcrypt.hash(password, salt);
    console.log(`Admin ${req.user.userId} está a ATUALIZAR A SENHA do usuário ${id}.`);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: id }, // Erro da linha 351 corrigido
      data: dataToUpdate,
      select: { id: true, nome: true, email: true, role: true, matricula: true }, // Retorna sem a senha
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Erro ao editar usuário ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ');
      return res.status(409).json({ error: `Já existe um usuário com este ${target}.` });
    }
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
});

// Rota para REMOVER um usuário (Admin)
app.delete('/api/user/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Autorização
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  const { id } = req.params;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do utilizador é inválido ou não fornecido.' });
  }

  // 2. Proteção: Não permitir que o Admin se auto-delete
  if (req.user?.userId === id) {
    return res.status(400).json({ error: 'Não é permitido remover o seu próprio utilizador.' });
  }

  try {
    await prisma.user.delete({
      where: { id: id },
    });
    console.log(`Usuário ${id} removido pelo Admin ${req.user.userId}.`);
    res.status(200).json({ message: 'Utilizador removido com sucesso.' });
  } catch (error) {
  // ... (restante do catch)
    console.error(`Erro ao remover usuário ${id}:`, error);
    
    // 3. Capturar erro de Chave Estrangeira (o utilizador tem registos)
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
      return res.status(409).json({ error: 'Este utilizador não pode ser removido pois possui jornadas, abastecimentos ou manutenções registadas. (Erro de integridade).' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.status(500).json({ error: 'Erro interno ao remover utilizador.' });
  }
});

// Rota para GERAR um token de login (QR Code) PERMANENTE
app.post('/api/user/:id/generate-login-token', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  
  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do utilizador é inválido ou não fornecido.' });
  }

  try {
    // 1. Gerar um token aleatório
    const token = crypto.randomBytes(32).toString('hex');
    
    // 2. Atualizar o utilizador com o token (SEM data de expiração)
    const user = await prisma.user.update({
      where: { 
        id: id,
        role: 'OPERADOR' 
      },
      data: {
        loginToken: token,
        loginTokenExpiresAt: null, // Garante que é nulo (permanente)
      },
      select: { id: true, nome: true, loginToken: true }
    });

    res.status(200).json({ loginToken: user.loginToken });
  
  } catch (error) {
    console.error("Erro ao gerar token de login:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Operador não encontrado.' });
    }
    res.status(500).json({ error: 'Erro interno ao gerar token.' });
  }
});

// Rota para REVOGAR (Excluir) um token manualmente
app.put('/api/user/:id/revoke-login-token', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  
  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do utilizador inválido.' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: id, role: 'OPERADOR' },
      data: {
        loginToken: null, // Remove o token
        loginTokenExpiresAt: null,
      },
      select: { id: true, nome: true }
    });

    res.status(200).json({ message: `Token de login revogado com sucesso para ${user.nome}.` });
  
  } catch (error) {
    console.error("Erro ao revogar token:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Operador não encontrado.' });
    }
    res.status(500).json({ error: 'Erro interno ao revogar token.' });
  }
});

// --- VEÍCULOS ---
app.post('/api/veiculo', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // ================== (AUTORIZAÇÃO) ==================
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar veículos.' });
  }
  
  try {
    const { 
      placa, 
      modelo, 
      ano, 
      tipoCombustivel, 
      capacidadeTanque, 
      tipoVeiculo,
      vencimentoCiv,
      vencimentoCipp
    } = req.body; 

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
  } catch (error) {
    console.error("Erro POST /veiculo:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: `Veículo com placa ${req.body.placa} já existe.` });
    }
    res.status(500).json({ error: 'Erro ao cadastrar veículo' });
  }
});

app.get('/api/veiculos', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const veiculos = await prisma.veiculo.findMany({ 
      orderBy: { placa: 'asc' } 
    });
    res.status(200).json(veiculos);
  } catch (error) {
    console.error("Erro GET /veiculos:", error);
    res.status(500).json({ error: 'Erro ao buscar veículos' });
  }
});

app.get('/api/veiculo/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  
  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do veículo é inválido ou não fornecido.' });
  }

  try {
    const veiculo = await prisma.veiculo.findUnique({
      where: { id: id },
    });

    if (!veiculo) {
      return res.status(404).json({ error: 'Veículo não encontrado.' });
    }
    
    // Formata as datas antes de enviar para o frontend
    const veiculoFormatado = {
      ...veiculo,
      vencimentoCiv: formatDateToInput(veiculo.vencimentoCiv),
      vencimentoCipp: formatDateToInput(veiculo.vencimentoCipp),
    };

    res.status(200).json(veiculoFormatado);
  } catch (error) {
    console.error(`Erro GET /api/veiculo/${id}:`, error);
    res.status(500).json({ error: 'Erro ao buscar dados do veículo.' });
  }
});

// ================== ROTA (PUT) ==================
app.put('/api/veiculo/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem editar veículos.' });
  }

  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do veículo é inválido ou não fornecido.' });
  }

  try {
    const {
      placa,
      modelo,
      ano,
      tipoCombustivel,
      capacidadeTanque,
      tipoVeiculo,
      vencimentoCiv,
      vencimentoCipp
    } = req.body;

    if (!placa || !modelo || !ano) {
      return res.status(400).json({ error: 'Placa, modelo e ano são obrigatórios' });
    }

    const updatedVeiculo = await prisma.veiculo.update({
      where: { id: id },
      data: {
        placa: placa.toUpperCase(),
        modelo,
        ano: parseInt(ano),
        tipoCombustivel: tipoCombustivel || 'DIESEL_S10',
        capacidadeTanque: capacidadeTanque ? parseFloat(capacidadeTanque) : null,
        tipoVeiculo: tipoVeiculo || null,
        
        // Converte a string YYYY-MM-DD (ou null) de volta para um objeto Date
        vencimentoCiv: vencimentoCiv ? new Date(vencimentoCiv) : null,
        vencimentoCipp: vencimentoCipp ? new Date(vencimentoCipp) : null,
      },
    });
    res.status(200).json(updatedVeiculo);
  } catch (error) {
    console.error(`Erro PUT /api/veiculo/${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: `Veículo com placa ${req.body.placa} já existe.` });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Veículo não encontrado para atualização.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar veículo.' });
  }
});

// ================== ROTA DELETE ==================
app.delete('/api/veiculo/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem remover veículos.' });
  }

  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do veículo é inválido ou não fornecido.' });
  }

  try {
    await prisma.veiculo.delete({
      where: { id: id },
    });
    console.log(`Veículo ${id} removido pelo Admin ${req.user.userId}.`);
    res.status(200).json({ message: 'Veículo removido com sucesso.' });
  } catch (error) {
    console.error(`Erro DELETE /api/veiculo/${id}:`, error);
    // Trata erro se o veículo tiver registos (jornadas, abastecimentos, etc)
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
      return res.status(409).json({ error: 'Este veículo não pode ser removido pois possui registos associados (jornadas, abastecimentos, etc.).' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Veículo não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao remover veículo.' });
  }
});

// --- ABASTECIMENTO ---
app.post('/api/abastecimento', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
 if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
   return res.status(403).json({ error: 'Apenas Encarregados ou Admins podem registrar abastecimentos.' });
 }
  try {
    const {
      veiculoId,
      operadorId,
      fornecedorId,
      kmOdometro,
      dataHora,
      placaCartaoUsado,
      itens,
      observacoes,
      justificativa,
      fotoNotaFiscalUrl
    } = req.body;
    
    if (!veiculoId || !operadorId || !fornecedorId || !kmOdometro || !dataHora || !itens || !placaCartaoUsado || !fotoNotaFiscalUrl) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando (Veículo, Operador, Fornecedor, KM, Data, Itens, Cartão e Foto da Nota).' });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: '"itens" deve ser um array não vazio.' });
    }

    let custoTotalGeral = 0;
    const itensParaCriar = [];
    const kmOdometroFloat = parseFloat(kmOdometro);

    // ================== (KM LÓGICO) ==================
    // 2. USAR O "SUPER-VERIFICADOR"
    const ultimoKM = await getUltimoKMRegistrado(veiculoId);
    if (kmOdometroFloat < ultimoKM) {
      return res.status(400).json({ 
        error: `KM do odômetro (${kmOdometroFloat}) é menor que o último KM registado (${ultimoKM}) para este veículo.` 
      });
    }

    for (const item of itens) {
      if (!item.produtoId || !item.quantidade || !item.valorPorUnidade) {
        return res.status(400).json({ error: 'Cada item deve ter produtoId, quantidade e valorPorUnidade.'});
      }
      if (parseFloat(item.quantidade) <= 0 || parseFloat(item.valorPorUnidade) <= 0) {
         return res.status(400).json({ error: 'Quantidade e Valor por Unidade devem ser positivos.'});
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
  } catch (error) {
    console.error("Erro POST /abastecimento:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
       const field = (error.meta?.field_name as string)?.replace('_id','');
      return res.status(404).json({ error: `ID inválido fornecido para ${field}. Registro não encontrado.` });
    }
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
         return res.status(404).json({ error: 'Um dos IDs fornecidos (veiculo, operador, fornecedor) não existe.' });
     }
    res.status(500).json({ error: 'Erro ao registrar abastecimento' });
  }
});

app.get('/api/veiculo/:veiculoId/abastecimentos', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (error) {
    console.error("Erro GET /:veiculoId/abastecimentos:", error);
    res.status(500).json({ error: 'Erro ao buscar abastecimentos' });
  }
});

// ROTA PARA HISTÓRICO DE ABASTECIMENTOS (Admin/Encarregado)
// ROTA PARA HISTÓRICO DE ABASTECIMENTOS (Admin/Encarregado)
app.get('/api/abastecimentos/recentes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  try {
    const { dataInicio, dataFim, veiculoId } = req.query;

    // Construção dinâmica do 'where'
    const where: Prisma.AbastecimentoWhereInput = {};

    // ================== CORREÇÃO AQUI ==================
    // 1. Criar um objeto de filtro de data separado
    const dateFilter: Prisma.DateTimeFilter = {};
    
    if (dataInicio && typeof dataInicio === 'string') {
      dateFilter.gte = new Date(dataInicio); // Linha 928 corrigida
    }
    if (dataFim && typeof dataFim === 'string') {
      // Adiciona 1 dia para incluir o dia final inteiro (até 23:59:59)
      const dataFimDate = new Date(dataFim);
      dataFimDate.setDate(dataFimDate.getDate() + 1);
      dateFilter.lt = dataFimDate; // Linha 934 corrigida
    }
    
    // 2. Atribuir o filtro ao 'where' APENAS se ele não estiver vazio
    if (Object.keys(dateFilter).length > 0) {
      where.dataHora = dateFilter;
    }
    // ================== FIM DA CORREÇÃO ==================

    if (veiculoId && typeof veiculoId === 'string') {
      where.veiculoId = veiculoId;
    }

    const recentes = await prisma.abastecimento.findMany({
      where: where, // Usa o filtro dinâmico
      take: 50, // Limita aos 50 mais recentes (do filtro)
      orderBy: { dataHora: 'desc' },
      include: {
        veiculo: { select: { placa: true, modelo: true } },
        operador: { select: { nome: true } },
        fornecedor: { select: { nome: true } },
        itens: {
          include: {
            produto: { select: { nome: true, tipo: true } }
          }
        }
      }
    });
    res.status(200).json(recentes);
  } catch (error) {
    console.error("Erro GET /api/abastecimentos/recentes:", error);
    res.status(500).json({ error: 'Erro ao buscar histórico de abastecimentos.' });
  }
});

// ROTA PARA DELETAR UM ABASTECIMENTO (Apenas Admin)
app.delete('/api/abastecimento/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Autorização (ESTRITA)
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem deletar registos.' });
  }

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'ID do abastecimento não fornecido.' });
  }

  try {
    // 2. Executar em transação
    const deleteItens = prisma.itemAbastecimento.deleteMany({
      where: { abastecimentoId: id },
    });

    const deleteAbastecimento = prisma.abastecimento.delete({
      where: { id: id },
    });

    await prisma.$transaction([deleteItens, deleteAbastecimento]);

    console.log(`Abastecimento ${id} e seus itens foram deletados pelo Admin ${req.user.userId}`);
    res.status(200).json({ message: 'Registo de abastecimento removido com sucesso.' });

  } catch (error) {
    console.error(`Erro ao deletar abastecimento ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Registo não encontrado. Pode já ter sido removido.' });
    }
    res.status(500).json({ error: 'Erro interno ao tentar remover o registo.' });
  }
});



// --- MANUTENÇÃO (ORDEM DE SERVIÇO) ---
app.post('/api/ordem-servico', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Apenas Encarregados ou Admins podem registrar manutenções.' });
  }
  
  const encarregadoId = req.user?.userId;

  try {
    const {
      veiculoId,
      fornecedorId,
      kmAtual,
      data,
      tipo,
      itens,
      observacoes,
      fotoComprovanteUrl
    } = req.body;

    if (!veiculoId || !fornecedorId || !kmAtual || !data || !tipo || !itens || !fotoComprovanteUrl) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando (Veículo, Oficina/Lavagem, KM, Data, Tipo, Itens e Foto).' });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: '"itens" deve ser um array não vazio (Ex: "Lavagem Completa" ou "Troca de Óleo").' });
    }

    let custoTotalGeral = 0;
    const itensParaCriar = [];
    const kmAtualFloat = parseFloat(kmAtual);

    // ================== (KM LÓGICO) ==================
    // 3. USAR O "SUPER-VERIFICADOR"
    const ultimoKM = await getUltimoKMRegistrado(veiculoId);
    if (kmAtualFloat < ultimoKM) {
      return res.status(400).json({ 
        error: `KM Atual (${kmAtualFloat}) é menor que o último KM registado (${ultimoKM}) para este veículo.` 
      });
    }

    for (const item of itens) {
      if (!item.produtoId || !item.quantidade || !item.valorPorUnidade) {
        return res.status(400).json({ error: 'Cada item deve ter produtoId, quantidade e valorPorUnidade.'});
      }
      if (parseFloat(item.quantidade) <= 0 || parseFloat(item.valorPorUnidade) < 0) {
         return res.status(400).json({ error: 'Quantidade deve ser positiva e Valor por Unidade não pode ser negativo.'});
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

  } catch (error) {
    console.error("Erro POST /api/ordem-servico:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2025')) {
       const field = (error.meta?.field_name as string)?.replace('_id','');
      return res.status(404).json({ error: `ID inválido fornecido para ${field}. Registro não encontrado.` });
    }
    res.status(500).json({ error: 'Erro ao registrar Ordem de Serviço' });
  }
});

app.get('/api/ordens-servico/recentes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  try {
    const { dataInicio, dataFim, veiculoId } = req.query;

    // Construção dinâmica do 'where'
    const where: Prisma.OrdemServicoWhereInput = {};

    // ================== CORREÇÃO AQUI ==================
    // 1. Criar um objeto de filtro de data separado
    const dateFilter: Prisma.DateTimeFilter = {};

    if (dataInicio && typeof dataInicio === 'string') {
      dateFilter.gte = new Date(dataInicio); // Linha 1103 corrigida
    }
    if (dataFim && typeof dataFim === 'string') {
      const dataFimDate = new Date(dataFim);
      dataFimDate.setDate(dataFimDate.getDate() + 1);
      dateFilter.lt = dataFimDate; // Linha 1108 corrigida
    }

    // 2. Atribuir o filtro ao 'where' APENAS se ele não estiver vazio
    if (Object.keys(dateFilter).length > 0) {
      where.data = dateFilter;
    }
    if (veiculoId && typeof veiculoId === 'string') {
      where.veiculoId = veiculoId;
    }

    const recentes = await prisma.ordemServico.findMany({
      where: where, // Usa o filtro dinâmico
      take: 50, // Limita aos 50 mais recentes (do filtro)
      orderBy: { data: 'desc' },
      include: {
        veiculo: { select: { placa: true, modelo: true } },
        encarregado: { select: { nome: true } }, // Quem registou
        fornecedor: { select: { nome: true } }, // Oficina/Lava-rápido
        itens: {
          include: {
            produto: { select: { nome: true } }
          }
        }
      }
    });
    res.status(200).json(recentes);
  } catch (error) {
    console.error("Erro GET /api/ordens-servico/recentes:", error);
    res.status(500).json({ error: 'Erro ao buscar histórico de manutenções.' });
  }
});

// <-- MUDANÇA: INÍCIO DA NOVA ROTA DELETE -->
// ROTA PARA DELETAR UMA ORDEM DE SERVIÇO (Apenas Admin)
app.delete('/api/ordem-servico/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Autorização (ESTRITA)
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem deletar registos.' });
  }

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'ID da Ordem de Serviço não fornecido.' });
  }

  try {
    // 2. Executar em transação
    const deleteItens = prisma.itemOrdemServico.deleteMany({
      where: { ordemServicoId: id },
    });

    const deleteOrdemServico = prisma.ordemServico.delete({
      where: { id: id },
    });

    await prisma.$transaction([deleteItens, deleteOrdemServico]);

    console.log(`Ordem de Serviço ${id} e seus itens foram deletados pelo Admin ${req.user.userId}`);
    res.status(200).json({ message: 'Registo de manutenção removido com sucesso.' });

  } catch (error) {
    console.error(`Erro ao deletar Ordem de Serviço ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Registo não encontrado. Pode já ter sido removido.' });
    }
    res.status(500).json({ error: 'Erro interno ao tentar remover o registo.' });
  }
});
// <-- MUDANÇA: FIM DA NOVA ROTA DELETE -->


// --- JORNADAS ---
app.post('/api/jornada/iniciar', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    // ================== (KM LÓGICO) ==================
    // 4. USAR O "SUPER-VERIFICADOR"
    const ultimoKM = await getUltimoKMRegistrado(veiculoId);
    if (kmInicioFloat < ultimoKM) {
      return res.status(400).json({ 
        error: `KM Inicial (${kmInicioFloat}) é menor que o último KM registado (${ultimoKM}) para este veículo.` 
      });
    }
    
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
    } else {
      resultadoTransacao = await prisma.$transaction([createNovaJornada]);
    }
    
    const novaJornadaCriada = resultadoTransacao[resultadoTransacao.length - 1]!;
    console.log(`Jornada ${novaJornadaCriada.id} iniciada por ${operadorId}`);
    res.status(201).json(novaJornadaCriada);
  } catch (error) {
    console.error("Erro POST /jornada/iniciar:", error);
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
       const field = (error.meta?.field_name as string)?.replace('_id','');
      return res.status(404).json({ error: `ID inválido fornecido para ${field}. Registro não encontrado.` });
    }
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
         return res.status(404).json({ error: 'ID do Veículo ou Encarregado não encontrado.' });
     }
    res.status(500).json({ error: 'Erro ao iniciar jornada' });
  }
});

// Finalizar Jornada (Operador ou Encarregado/Admin)
app.put('/api/jornada/finalizar/:jornadaId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    
    // ================== (KM LÓGICO) ==================
    // 5. USAR O "SUPER-VERIFICADOR" (Mesmo ao finalizar)
    // Garantir que o KM final não é menor que o último KM mestre (de outro evento)
    const ultimoKM = await getUltimoKMRegistrado(jornadaExistente.veiculoId);
    if (kmFimFloat < ultimoKM && ultimoKM > jornadaExistente.kmInicio) {
       return res.status(400).json({ 
         error: `Atenção: O KM Final (${kmFimFloat}) é menor que o último KM registado (${ultimoKM}) em outro evento (Abastecimento/Manutenção). Corrija o valor.` 
       });
    }
    // Verificação interna 
    if (kmFimFloat < jornadaExistente.kmInicio) {
      return res.status(400).json({ error: `Atenção: A jornada começou com ${jornadaExistente.kmInicio} KM. O KM Final (${kmFimFloat}) precisa ser um número MAIOR. Por favor, corrija o valor.` });
    }

    const proximaJornada = await prisma.jornada.findFirst({
        where: { veiculoId: jornadaExistente.veiculoId, dataInicio: { gt: jornadaExistente.dataInicio } },
        orderBy: { dataInicio: 'asc' }
    });
    if(proximaJornada && kmFimFloat > proximaJornada.kmInicio) {
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
  } catch (error) {
    console.error("Erro PUT /jornada/finalizar:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: `Jornada com ID ${req.params?.jornadaId} não encontrada.` });
    }
    res.status(500).json({ error: 'Erro ao finalizar jornada' });
  }
});

// Buscar Jornadas Abertas (Apenas Encarregado/Admin)
app.get('/api/jornadas/abertas', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (error) {
    console.error("Erro GET /jornadas/abertas:", error);
    res.status(500).json({ error: 'Erro ao buscar jornadas em aberto' });
  }
});

// ROTA ATUALIZADA (Regra C: Timeout de 17h)
app.get('/api/jornadas/minhas-abertas-operador', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    const jornadasAtivasValidas: any[] = []; 
    const updatesBatch: Prisma.PrismaPromise<any>[] = []; 

    for (const jornada of jornadasAbertasOperador) {
        const inicioJornada = new Date(jornada.dataInicio);
        const horasPassadas = (agora.getTime() - inicioJornada.getTime()) / (1000 * 60 * 60);

        if (horasPassadas > 17) {
            console.log(`[GET /minhas-abertas] Fechando automaticamente a jornada ${jornada.id} por tempo limite de 17h.`);
            updatesBatch.push(
                prisma.jornada.update({
                    where: { id: jornada.id },
                    data: { 
                        kmFim: jornada.kmInicio, 
                        dataFim: agora, 
                        observacoes: (jornada.observacoes || '') + ' [Fechada automaticamente por tempo limite (17h).]'
                    }
                })
            );
        } else {
            jornadasAtivasValidas.push(jornada);
        }
    }
    
    if (updatesBatch.length > 0) {
        await prisma.$transaction(updatesBatch); 
    }

    res.status(200).json(jornadasAtivasValidas); 

  } catch (error) {
    console.error("Erro GET /jornadas/minhas-abertas-operador:", error);
    res.status(500).json({ error: 'Erro ao buscar jornadas ativas' });
  }
});


// --- RELATÓRIOS ---
app.get('/api/relatorio/consumo/:veiculoId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
 if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
   return res.status(403).json({ error: 'Acesso não autorizado.'});
 }
  try {
    const { veiculoId } = req.params;
    if (!veiculoId) {
      return res.status(400).json({ error: 'veiculoId não foi fornecido.' });
    }
    const abastecimentos = await prisma.abastecimento.findMany({
      where: { veiculoId: veiculoId },
      orderBy: { kmOdometro: 'asc' },
    });
    if (abastecimentos.length < 2) {
      return res.status(400).json({ message: 'Dados insuficientes (mínimo 2 abastecimentos).' });
    }

    const kmInicial = abastecimentos[0]!.kmOdometro;
    const kmFinal = abastecimentos[abastecimentos.length - 1]!.kmOdometro;
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
  } catch (error) {
    console.error("Erro GET /relatorio/consumo:", error);
    res.status(500).json({ error: 'Erro ao calcular consumo' });
  }
});

app.get('/api/relatorio/custo/:veiculoId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
 if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
   return res.status(403).json({ error: 'Acesso não autorizado.'});
 }
  try {
    const { veiculoId } = req.params;
    if (!veiculoId) {
      return res.status(400).json({ error: 'veiculoId não foi fornecido.' });
    }
    const abastecimentos = await prisma.abastecimento.findMany({
      where: { veiculoId: veiculoId },
      orderBy: { kmOdometro: 'asc' },
    });
    if (abastecimentos.length < 2) {
      return res.status(400).json({ message: 'Dados insuficientes (mínimo 2 abastecimentos).' });
    }
    const kmInicial = abastecimentos[0]!.kmOdometro;
    const kmFinal = abastecimentos[abastecimentos.length - 1]!.kmOdometro;
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
  } catch (error) {
    console.error("Erro GET /relatorio/custo:", error);
    res.status(500).json({ error: 'Erro ao calcular custo por km' });
  }
});


// ===================================================================
// PASSO 3: ROTA DE SUMÁRIO MENSAL (KPIs)
// ===================================================================
app.get('/api/relatorio/sumario', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  try {
    // ================== Ler o veiculoId da query ==================
    const { ano, mes, veiculoId } = req.query; 

    // 1. Define o período de filtro (Default: Mês atual)
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1; // JS month é 0-11
    
    const anoNum = ano ? parseInt(ano as string) : anoAtual;
    const mesNum = mes ? parseInt(mes as string) : mesAtual;

    const dataInicio = new Date(anoNum, mesNum - 1, 1); 
    const dataFim = new Date(anoNum, mesNum, 1);

    // ================== Criar os objectos de filtro dinâmicos ==================
    // Filtro de data (para todas as consultas)
    const filtroDataHora = {
      gte: dataInicio,
      lt: dataFim
    };

    // Filtro de veículo (só é adicionado se veiculoId existir)
    const filtroVeiculo = veiculoId ? { veiculoId: veiculoId as string } : {};

    
    // 2. KPI: Custos de COMBUSTÍVEL (ex: Diesel)
    const custoCombustivelResult = await prisma.itemAbastecimento.aggregate({
      _sum: { valorTotal: true },
      where: {
        produto: {
          tipo: 'COMBUSTIVEL'
        },
        abastecimento: { // ================== Aplicar os filtros ==================
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
        abastecimento: { // ================== Aplicar os filtros ==================
          dataHora: filtroDataHora,
          ...filtroVeiculo
        }
      }
    });
    const custoTotalAditivo = custoAditivoResult._sum.valorTotal || 0;
    
    // 4. KPI: Custos de Manutenção e Lavagem
    const custoManutencaoResult = await prisma.ordemServico.aggregate({
      _sum: { custoTotal: true },
      where: { // ================== Aplicar os filtros ==================
        data: filtroDataHora,
        ...filtroVeiculo
      }
    });
    const custoTotalManutencao = custoManutencaoResult._sum.custoTotal || 0;

    // 5. KPI: KM Total Rodado
    const jornadasNoPeriodo = await prisma.jornada.findMany({
      where: { // ================== Aplicar os filtros ==================
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
        abastecimento: { // ================== Aplicar os filtros ==================
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
        veiculoId: (veiculoId as string) || 'frota_inteira'
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

  } catch (error) {
    console.error("Erro GET /api/relatorio/sumario:", error);
    res.status(500).json({ error: 'Erro ao calcular sumário' });
  }
});


//  CRUD PARA PLANOS DE MANUTENÇÃO
// --- Criar um novo Plano de Manutenção ---
app.post('/api/plano-manutencao', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas Admins podem criar planos de manutenção.' });
  }
  try {
    const { veiculoId, descricao, tipoIntervalo, valorIntervalo } = req.body;

    if (!veiculoId || !descricao || !tipoIntervalo || !valorIntervalo) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // ================== (KM LÓGICO) ==================
    // 6. USAR O "SUPER-VERIFICADOR" para definir o próximo alerta
    const kmAtual = await getUltimoKMRegistrado(veiculoId);
    
    let kmProximaManutencao = null;
    let dataProximaManutencao = null;

    if (tipoIntervalo === 'KM') {
      kmProximaManutencao = kmAtual + parseFloat(valorIntervalo);
    } else if (tipoIntervalo === 'TEMPO') {
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
  } catch (error) {
    console.error("Erro POST /api/plano-manutencao:", error);
    res.status(500).json({ error: 'Erro ao criar plano de manutenção.' });
  }
});

// --- Listar todos os Planos (para a nova aba do Admin) ---
app.get('/api/planos-manutencao', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  try {
    const planos = await prisma.planoManutencao.findMany({
      include: {
        veiculo: { select: { placa: true, modelo: true } }
      },
      orderBy: { veiculo: { placa: 'asc' } }
    });
    res.status(200).json(planos);
  } catch (error) {
    console.error("Erro GET /api/planos-manutencao:", error);
    res.status(500).json({ error: 'Erro ao buscar planos.' });
  }
});

// --- Deletar um Plano de Manutenção ---
app.delete('/api/plano-manutencao/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    res.status(204).send();
  } catch (error) {
    console.error("Erro DELETE /api/plano-manutencao:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao deletar plano.' });
  }
});

// ===================================================================
// PASSO 4: API DE ALERTAS PROATIVOS
// ===================================================================
app.get('/api/alertas', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  try {
    const alertas: any[] = [];
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
        } else if (kmRestante <= limiteAlertaKM) {
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
    
  } catch (error) {
     console.error("Erro GET /api/alertas:", error);
     res.status(500).json({ error: 'Erro ao buscar alertas.' });
  }
});

// ===================================================================
// PASSO 5: API DE RANKING DE MOTORISTAS (KM/L)
// ===================================================================
app.get('/api/relatorio/ranking-operadores', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
    return res.status(403).json({ error: 'Acesso não autorizado.' });
  }

  try {
    const { ano, mes } = req.query;

    // 1. Define o período de filtro (Default: Mês atual)
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    
    const anoNum = ano ? parseInt(ano as string) : anoAtual;
    const mesNum = mes ? parseInt(mes as string) : mesAtual;

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

    const kmsPorOperador = new Map<string, number>();
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

    const litrosPorOperador = new Map<string, number>();
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

  } catch (error) {
     console.error("Erro GET /api/relatorio/ranking-operadores:", error);
     res.status(500).json({ error: 'Erro ao calcular ranking de operadores.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});