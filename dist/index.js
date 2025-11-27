"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
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
// ================== VERIFICAÇÃO DE SEGURANÇA ==================
if (!process.env.TOKEN_SECRET) {
    console.error("🔴 ERRO FATAL: TOKEN_SECRET não definido nas variáveis de ambiente.");
    process.exit(1);
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// ================== MIDDLEWARES GLOBAIS ==================
app.use(express_1.default.json());
// ================== CONFIGURAÇÃO DE CORS ==================
// Permite definir origens via .env (separadas por vírgula) ou usa '*' como fallback (dev)
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['*'];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Permite requisições sem 'origin'
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
// ================== DEFINIÇÃO DE ROTAS ==================
// Autenticação
app.use('/api/auth', auth_routes_1.default);
// Usuários
app.use('/api/user', user_routes_1.default);
app.use('/api/users', user_routes_1.default);
// Veículos
app.use('/api/veiculo', Veiculo_routes_1.default);
app.use('/api/veiculos', Veiculo_routes_1.default);
// Abastecimentos
app.use('/api/abastecimento', abastecimento_routes_1.default);
app.use('/api/abastecimentos', abastecimento_routes_1.default);
// Jornadas
app.use('/api/jornada', jornada_routes_1.default);
app.use('/api/jornadas', jornada_routes_1.default);
// Manutenção (Ordem de Serviço)
app.use('/api/ordem-servico', manutencao_routes_1.default);
app.use('/api/ordens-servico', manutencao_routes_1.default);
// Produtos
app.use('/api/produto', produto_routes_1.default);
app.use('/api/produtos', produto_routes_1.default);
// Fornecedores
app.use('/api/fornecedor', fornecedor_routes_1.default);
app.use('/api/fornecedores', fornecedor_routes_1.default);
// Planos de Manutenção
app.use('/api/plano-manutencao', planoManutencao_routes_1.default);
app.use('/api/planos-manutencao', planoManutencao_routes_1.default);
// Relatórios e Alertas
app.use('/api/relatorio', relatorio_routes_1.default);
app.use('/api', relatorio_routes_1.default);
// Rota de Health Check (Para monitoramento no Render)
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date() });
});
// ================== INICIALIZAÇÃO DO SERVIDOR ==================
app.listen(port, () => {
    console.log(`✅ Servidor Backend (MVC) rodando na porta ${port}`);
    console.log(`🌍 CORS permitido para: ${allowedOrigins.join(', ')}`);
});
//# sourceMappingURL=index.js.map