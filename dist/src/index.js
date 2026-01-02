"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const node_cron_1 = __importDefault(require("node-cron"));
const env_1 = require("./config/env");
// Services e Middlewares
const JornadaService_1 = require("./services/JornadaService");
const errorHandler_1 = require("./middleware/errorHandler");
// ================== IMPORTS DE ROTAS ==================
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const Veiculo_routes_1 = __importDefault(require("./routes/Veiculo.routes"));
const abastecimento_routes_1 = __importDefault(require("./routes/abastecimento.routes"));
const jornada_routes_1 = __importDefault(require("./routes/jornada.routes"));
const manutencao_routes_1 = __importDefault(require("./routes/manutencao.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const produto_routes_1 = __importDefault(require("./routes/produto.routes"));
const fornecedor_routes_1 = __importDefault(require("./routes/fornecedor.routes"));
const planoManutencao_routes_1 = __importDefault(require("./routes/planoManutencao.routes"));
const relatorio_routes_1 = __importDefault(require("./routes/relatorio.routes"));
const cargo_routes_1 = __importDefault(require("./routes/cargo.routes"));
const treinamento_routes_1 = __importDefault(require("./routes/treinamento.routes"));
// ================== VERIFICAÇÃO DE AMBIENTE ==================
if (!process.env.TOKEN_SECRET) {
    console.error("🔴 ERRO FATAL: TOKEN_SECRET não definido no .env");
    process.exit(1);
}
const app = (0, express_1.default)();
const port = env_1.env.PORT || 3001;
// ================== MIDDLEWARES GLOBAIS ==================
app.use(express_1.default.json());
// Configuração de CORS
const allowedOrigins = env_1.env.CORS_ORIGINS.includes(',')
    ? env_1.env.CORS_ORIGINS.split(',')
    : [env_1.env.CORS_ORIGINS];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Bloqueado pela política de CORS'));
        }
    }
}));
// ================== ROTAS DA API ==================
// Autenticação e Usuários
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
// Gestão de Frota
app.use('/api/veiculos', Veiculo_routes_1.default);
app.use('/api/abastecimentos', abastecimento_routes_1.default);
app.use('/api/jornadas', jornada_routes_1.default);
app.use('/api/ordens-servico', manutencao_routes_1.default);
app.use('/api/planos-manutencao', planoManutencao_routes_1.default);
// Cadastros Auxiliares
app.use('/api/produtos', produto_routes_1.default);
app.use('/api/fornecedores', fornecedor_routes_1.default);
// RH e Gestão
app.use('/api/cargos', cargo_routes_1.default);
app.use('/api/treinamentos', treinamento_routes_1.default);
// Relatórios
app.use('/api/relatorios', relatorio_routes_1.default);
// Health Check (Monitoramento)
app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date() });
});
// ================== TRATAMENTO DE ERROS ==================
app.use(errorHandler_1.errorHandler);
// ================== CRON JOBS ==================
// Executa no minuto 0 de cada hora (ex: 08:00, 09:00, 10:00...)
node_cron_1.default.schedule('0 * * * *', async () => {
    const agora = new Date().toLocaleString('pt-BR');
    console.log(`⏰ [CRON] Disparando verificação de jornadas às ${agora}...`);
    try {
        await JornadaService_1.JornadaService.fecharJornadasVencidas();
        // Não precisa de log de sucesso aqui se o Service já loga, 
        // mas garante que a chamada async terminou.
    }
    catch (error) {
        // Esse catch é uma redundância de segurança caso o Service falhe fatalmente
        console.error('❌ [CRON] Falha crítica ao tentar executar o job:', error);
    }
});
// ROTA TEMPORÁRIA DE TESTE (Remova antes de ir para produção oficial)
app.get('/api/test-cron', async (req, res) => {
    console.log('🧪 Forçando execução do Cron via API...');
    try {
        await JornadaService_1.JornadaService.fecharJornadasVencidas();
        res.json({ message: 'Robô executado com sucesso! Verifique os logs do console.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ================== START SERVER ==================
app.listen(port, () => {
    console.log(`✅ Servidor rodando na porta ${port}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
//# sourceMappingURL=index.js.map