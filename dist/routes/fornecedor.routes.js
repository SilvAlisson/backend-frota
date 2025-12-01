"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FornecedorController_1 = require("../controllers/FornecedorController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const fornecedor_schemas_1 = require("../schemas/fornecedor.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(fornecedor_schemas_1.fornecedorSchema), FornecedorController_1.FornecedorController.create);
router.put('/:id', (0, validate_1.validate)(fornecedor_schemas_1.fornecedorSchema), FornecedorController_1.FornecedorController.update);
router.get('/', FornecedorController_1.FornecedorController.list);
router.get('/:id', FornecedorController_1.FornecedorController.getById);
router.delete('/:id', FornecedorController_1.FornecedorController.delete);
exports.default = router;
//# sourceMappingURL=fornecedor.routes.js.map