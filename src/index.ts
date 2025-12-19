import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cron from 'node-cron';
import { env } from './config/env';

// Services e Middlewares
import { JornadaService } from './services/JornadaService';
import { errorHandler } from './middleware/errorHandler';

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
import cargoRoutes from './routes/cargo.routes';
import treinamentoRoutes from './routes/treinamento.routes';

// ================== VERIFICAÇÃO DE AMBIENTE ==================
if (!process.env.TOKEN_SECRET) {
  console.error("🔴 ERRO FATAL: TOKEN_SECRET não definido no .env");
  process.exit(1);
}

const app = express();
const port = env.PORT || 3001;

// ================== MIDDLEWARES GLOBAIS ==================
app.use(express.json());

// Configuração de CORS
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

// ================== ROTAS DA API ==================
// Autenticação e Usuários
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Gestão de Frota
app.use('/api/veiculos', veiculoRoutes);
app.use('/api/abastecimentos', abastecimentoRoutes);
app.use('/api/jornadas', jornadaRoutes);
app.use('/api/ordens-servico', manutencaoRoutes);
app.use('/api/planos-manutencao', planoManutencaoRoutes);

// Cadastros Auxiliares
app.use('/api/produtos', produtoRoutes);
app.use('/api/fornecedores', fornecedorRoutes);

// RH e Gestão
app.use('/api/cargos', cargoRoutes);
app.use('/api/treinamentos', treinamentoRoutes);

// Relatórios
app.use('/api/relatorios', relatorioRoutes);

// Health Check (Monitoramento)
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// ================== TRATAMENTO DE ERROS ==================
app.use(errorHandler);

// ================== CRON JOBS ==================
cron.schedule('0 * * * *', async () => {
  await JornadaService.fecharJornadasVencidas();
});

// ================== START SERVER ==================
app.listen(port, () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});