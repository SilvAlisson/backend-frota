import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { JornadaService } from './services/JornadaService';
// A importação do env já valida as variáveis automaticamente ao iniciar
import { env } from './config/env';

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

const app = express();

// ================== MIDDLEWARES GLOBAIS ==================
app.use(express.json());

// ================== CONFIGURAÇÃO DE CORS ==================
const allowedOrigins = env.CORS_ORIGINS.includes(',')
  ? env.CORS_ORIGINS.split(',')
  : [env.CORS_ORIGINS];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como apps mobile ou curl)
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
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/veiculo', veiculoRoutes);
app.use('/api/veiculos', veiculoRoutes);
app.use('/api/abastecimento', abastecimentoRoutes);
app.use('/api/abastecimentos', abastecimentoRoutes);
app.use('/api/jornada', jornadaRoutes);
app.use('/api/jornadas', jornadaRoutes);
app.use('/api/ordem-servico', manutencaoRoutes);
app.use('/api/ordens-servico', manutencaoRoutes);
app.use('/api/produto', produtoRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/fornecedor', fornecedorRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/plano-manutencao', planoManutencaoRoutes);
app.use('/api/planos-manutencao', planoManutencaoRoutes);
app.use('/api/relatorio', relatorioRoutes);
app.use('/api', relatorioRoutes);

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// ================== CRON JOBS ==================
// Roda a cada hora (minuto 0) para fechar jornadas esquecidas
cron.schedule('0 * * * *', async () => {
  console.log('⏰ [Cron] Executando verificação automática de jornadas vencidas...');
  await JornadaService.fecharJornadasVencidas();
});

// ================== INICIALIZAÇÃO ==================
app.listen(env.PORT, () => {
  console.log(`✅ Servidor Backend (MVC) rodando na porta ${env.PORT}`);
  console.log(`🌍 CORS permitido para: ${allowedOrigins.join(', ')}`);
});