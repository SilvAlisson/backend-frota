"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', AuthController_1.AuthController.login);
router.post('/login-token', AuthController_1.AuthController.loginWithToken);
// Rota protegida para gerar token (apenas Admin/Encarregado)
router.post('/user/:id/generate-token', auth_1.authenticateToken, AuthController_1.AuthController.generateToken);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map