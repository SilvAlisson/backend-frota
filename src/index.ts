import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // Garante que o .env é carregado

// ================== IMPORTS DE ROTAS ==================
import authRoutes from './routes/auth.routes';
import veiculoRoutes from './routes/veiculo.routes';
import abastecimentoRoutes from './routes/abastecimento.routes';
import jornadaRoutes from './routes/jornada.routes';
import manutencaoRoutes from './routes/manutencao.routes';
import userRoutes from './routes/user.routes';
import produtoRoutes from './routes/produto.routes';
import fornecedorRoutes from './routes/fornecedor.routes';
import planoManutencaoRoutes from './routes/planoManutencao.routes';
import relatorioRoutes from './routes/relatorio.routes';

// ================== VERIFICAÇÃO DE SEGURANÇA ==================
if (!process.env.TOKEN_SECRET) {
  console.error("🔴 ERRO FATAL: TOKEN_SECRET não definido nas variáveis de ambiente.");
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

// ================== MIDDLEWARES GLOBAIS ==================
app.use(express.json());

// Configuração de CORS (Mantendo a sua whitelist original)
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

// ================== DEFINIÇÃO DE ROTAS (API V1) ==================

// Autenticação
app.use('/api/auth', authRoutes);

// Usuários
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);

// Veículos
app.use('/api/veiculo', veiculoRoutes);
app.use('/api/veiculos', veiculoRoutes);

// Abastecimentos
app.use('/api/abastecimento', abastecimentoRoutes);
app.use('/api/abastecimentos', abastecimentoRoutes);

// Jornadas
app.use('/api/jornada', jornadaRoutes);
app.use('/api/jornadas', jornadaRoutes);

// Manutenção (Ordem de Serviço)
app.use('/api/ordem-servico', manutencaoRoutes);
app.use('/api/ordens-servico', manutencaoRoutes);

// Produtos
app.use('/api/produto', produtoRoutes);
app.use('/api/produtos', produtoRoutes);

// Fornecedores
app.use('/api/fornecedor', fornecedorRoutes);
app.use('/api/fornecedores', fornecedorRoutes);

// Planos de Manutenção
app.use('/api/plano-manutencao', planoManutencaoRoutes);
app.use('/api/planos-manutencao', planoManutencaoRoutes);

// Relatórios e Alertas
app.use('/api/relatorio', relatorioRoutes);
app.use('/api', relatorioRoutes);

// Rota de Health Check (Para monitoramento no Render)
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// ================== INICIALIZAÇÃO DO SERVIDOR ==================
app.listen(port, () => {
  console.log(`✅ Servidor Backend (MVC) rodando na porta ${port}`);
});