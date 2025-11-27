"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_schemas_1 = require("../schemas/auth.schemas");
const router = (0, express_1.Router)();
// Middleware global de autenticação para todas as rotas abaixo
router.use(auth_1.authenticateToken);
// Apenas ADMIN pode criar usuários + Validação Zod
router.post('/register', (0, auth_1.authorize)(['ADMIN']), (0, validate_1.validate)(auth_schemas_1.registerUserSchema), UserController_1.UserController.create);
// Qualquer autenticado vê a lista (ou restrinja se quiser)
router.get('/', UserController_1.UserController.list);
// Apenas ADMIN vê detalhes
router.get('/:id', (0, auth_1.authorize)(['ADMIN']), UserController_1.UserController.getById);
// Apenas ADMIN edita
router.put('/:id', (0, auth_1.authorize)(['ADMIN']), UserController_1.UserController.update);
// Apenas ADMIN deleta
router.delete('/:id', (0, auth_1.authorize)(['ADMIN']), UserController_1.UserController.delete);
exports.default = router;
//# sourceMappingURL=user.routes.js.map