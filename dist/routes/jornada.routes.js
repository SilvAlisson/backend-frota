"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JornadaController_1 = require("../controllers/JornadaController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const jornada_schemas_1 = require("../schemas/jornada.schemas");
const router = (0, express_1.Router)();
const jornadaController = new JornadaController_1.JornadaController();
router.use(auth_1.authenticateToken);
router.post('/iniciar', (0, validate_1.validate)(jornada_schemas_1.iniciarJornadaSchema), jornadaController.iniciar);
router.put('/finalizar/:id', (0, validate_1.validate)(jornada_schemas_1.finalizarJornadaSchema), jornadaController.finalizar);
router.get('/historico', (0, validate_1.validate)(jornada_schemas_1.buscaJornadaSchema), jornadaController.listarHistorico);
router.get('/abertas', jornadaController.listarAbertas);
router.get('/minhas-abertas-operador', jornadaController.listarMinhasAbertas);
router.post('/verificar-timeouts', jornadaController.verificarTimeouts);
router.delete('/:id', jornadaController.delete);
exports.default = router;
//# sourceMappingURL=jornada.routes.js.map