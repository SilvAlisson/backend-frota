"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FornecedorController_1 = require("../controllers/FornecedorController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', FornecedorController_1.FornecedorController.create);
router.get('/', FornecedorController_1.FornecedorController.list);
router.get('/:id', FornecedorController_1.FornecedorController.getById);
router.put('/:id', FornecedorController_1.FornecedorController.update);
router.delete('/:id', FornecedorController_1.FornecedorController.delete);
exports.default = router;
//# sourceMappingURL=fornecedor.routes.js.map