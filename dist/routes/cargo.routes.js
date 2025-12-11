"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CargoController_1 = require("../controllers/CargoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cargo_schemas_1 = require("../schemas/cargo.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Rotas de Cargo
router.post('/', (0, validate_1.validate)(cargo_schemas_1.cargoSchema), CargoController_1.CargoController.create);
router.get('/', CargoController_1.CargoController.list);
// Rotas de DELETE 
router.delete('/:id', CargoController_1.CargoController.delete);
// Rotas de Requisitos
router.post('/:id/requisitos', (0, validate_1.validate)(cargo_schemas_1.addRequisitoSchema), CargoController_1.CargoController.addRequisito);
router.delete('/requisitos/:requisitoId', CargoController_1.CargoController.removeRequisito);
exports.default = router;
//# sourceMappingURL=cargo.routes.js.map