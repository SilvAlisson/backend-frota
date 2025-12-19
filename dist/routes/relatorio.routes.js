"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RelatorioController_1 = require("../controllers/RelatorioController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const relatorio_schemas_1 = require("../schemas/relatorio.schemas");
const router = (0, express_1.Router)();
const relatorioController = new RelatorioController_1.RelatorioController();
router.use(auth_1.authenticateToken);
// Adicionado middleware 'validate' para garantir tipos de Query Params (ano, mes)
router.get('/sumario', (0, validate_1.validate)(relatorio_schemas_1.relatorioQuerySchema), relatorioController.sumario);
router.get('/ranking', (0, validate_1.validate)(relatorio_schemas_1.relatorioQuerySchema), relatorioController.ranking);
// Alertas não precisa de input complexo, apenas filtro interno
router.get('/alertas', relatorioController.alertas);
exports.default = router;
//# sourceMappingURL=relatorio.routes.js.map