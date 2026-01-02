"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_schemas_1 = require("../schemas/auth.schemas");
const router = (0, express_1.Router)();
// Rota de Login (Email/Senha)
router.post('/login', (0, validate_1.validate)(auth_schemas_1.loginSchema), AuthController_1.AuthController.login);
// Rota de Login Rápido (Token/QR Code)
router.post('/login-token', (0, validate_1.validate)(auth_schemas_1.loginWithTokenSchema), AuthController_1.AuthController.loginWithToken);
// Rota protegida para gerar token (apenas Admin/Encarregado)
router.post('/user/:id/generate-token', auth_1.authenticateToken, (0, validate_1.validate)(auth_schemas_1.generateTokenSchema), AuthController_1.AuthController.generateToken);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map