"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_schemas_1 = require("../schemas/auth.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Criar Usuário (Validação Completa)
router.post('/register', (0, auth_1.authorize)(['ADMIN', 'RH']), (0, validate_1.validate)(auth_schemas_1.registerUserSchema), UserController_1.UserController.create);
router.get('/', UserController_1.UserController.list);
router.get('/:id', (0, auth_1.authorize)(['ADMIN', 'RH']), UserController_1.UserController.getById);
// Update: Por enquanto sem validação Zod estrita para permitir parciais, 
// ou você pode criar um 'updateUserSchema' onde todos os campos são .optional()
router.put('/:id', (0, auth_1.authorize)(['ADMIN', 'RH']), UserController_1.UserController.update);
router.delete('/:id', (0, auth_1.authorize)(['ADMIN', 'RH']), UserController_1.UserController.delete);
exports.default = router;
//# sourceMappingURL=user.routes.js.map