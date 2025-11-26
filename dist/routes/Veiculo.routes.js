"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const veiculoController_1 = require("../controllers/veiculoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas as rotas de veículo são protegidas
router.use(auth_1.authenticateToken);
router.post('/', veiculoController_1.VeiculoController.create);
router.get('/', veiculoController_1.VeiculoController.list);
router.get('/:id', veiculoController_1.VeiculoController.getById);
router.put('/:id', veiculoController_1.VeiculoController.update);
router.delete('/:id', veiculoController_1.VeiculoController.delete);
exports.default = router;
//# sourceMappingURL=Veiculo.routes.js.map