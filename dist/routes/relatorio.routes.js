"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RelatorioController_1 = require("../controllers/RelatorioController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const relatorio_schemas_1 = require("../schemas/relatorio.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Aplicamos o middleware para validar os Query Params (ano, mes)
router.get('/sumario', (0, validate_1.validate)(relatorio_schemas_1.relatorioQuerySchema), RelatorioController_1.RelatorioController.sumario);
router.get('/ranking-operadores', (0, validate_1.validate)(relatorio_schemas_1.relatorioQuerySchema), RelatorioController_1.RelatorioController.ranking);
router.get('/alertas', RelatorioController_1.RelatorioController.alertas);
exports.default = router;
//# sourceMappingURL=relatorio.routes.js.map