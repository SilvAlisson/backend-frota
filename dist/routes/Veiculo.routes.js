"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VeiculoController_1 = require("../controllers/VeiculoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const veiculo_schemas_1 = require("../schemas/veiculo.schemas");
const router = (0, express_1.Router)();
const veiculoController = new VeiculoController_1.VeiculoController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(veiculo_schemas_1.veiculoSchema), veiculoController.create);
router.get('/', veiculoController.list);
router.get('/:id', veiculoController.getById);
router.put('/:id', (0, validate_1.validate)(veiculo_schemas_1.veiculoSchema), veiculoController.update);
router.delete('/:id', veiculoController.delete);
router.get('/:id/detalhes', veiculoController.getDetalhes);
exports.default = router;
//# sourceMappingURL=Veiculo.routes.js.map