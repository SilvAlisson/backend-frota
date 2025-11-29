import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cron from 'node-cron';
import { JornadaService } from './services/JornadaService';
import { env } from './config/env';

// ================== IMPORTS DE ROTAS ==================
import authRoutes from './routes/auth.routes';
import veiculoRoutes from './routes/Veiculo.routes';
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
const port = env.PORT || 3001;

// ================== MIDDLEWARES GLOBAIS ==================
app.use(express.json());

// ================== CONFIGURAÇÃO DE CORS ==================
const allowedOrigins = env.CORS_ORIGINS.includes(',')
  ? env.CORS_ORIGINS.split(',')
  : [env.CORS_ORIGINS];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela política de CORS'));
    }
  }
}));

// ================== ROTAS ==================
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

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// ================== CRON JOBS ==================
cron.schedule('0 * * * *', async () => {
  console.log('⏰ [Cron] Executando verificação automática de jornadas vencidas...');
  await JornadaService.fecharJornadasVencidas();
});

// ================== INICIALIZAÇÃO ==================
app.listen(port, () => {
  console.log(`✅ Servidor Backend (MVC) rodando na porta ${port}`);
  console.log(`🌍 CORS permitido para: ${allowedOrigins.join(', ')}`);
});