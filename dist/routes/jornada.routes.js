"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JornadaController_1 = require("../controllers/JornadaController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const jornada_schemas_1 = require("../schemas/jornada.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Iniciar (Valida Body)
router.post('/iniciar', (0, validate_1.validate)(jornada_schemas_1.iniciarJornadaSchema), JornadaController_1.JornadaController.iniciar);
// Finalizar (Valida ID no Params + Body)
router.put('/finalizar/:id', (0, validate_1.validate)(jornada_schemas_1.finalizarJornadaSchema), JornadaController_1.JornadaController.finalizar);
// Buscas (Valida Query Params)
router.get('/historico', (0, validate_1.validate)(jornada_schemas_1.buscaJornadaSchema), JornadaController_1.JornadaController.listarHistorico);
// Rotas sem validação complexa (apenas autenticação)
router.get('/abertas', JornadaController_1.JornadaController.listarAbertas);
router.get('/minhas-abertas-operador', JornadaController_1.JornadaController.listarMinhasAbertas);
router.post('/verificar-timeouts', JornadaController_1.JornadaController.verificarTimeouts);
router.delete('/:id', JornadaController_1.JornadaController.delete);
exports.default = router;
//# sourceMappingURL=jornada.routes.js.map