"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProdutoController_1 = require("../controllers/ProdutoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', ProdutoController_1.ProdutoController.create);
router.get('/', ProdutoController_1.ProdutoController.list);
router.get('/:id', ProdutoController_1.ProdutoController.getById);
router.put('/:id', ProdutoController_1.ProdutoController.update);
router.delete('/:id', ProdutoController_1.ProdutoController.delete);
exports.default = router;
//# sourceMappingURL=produto.routes.js.map