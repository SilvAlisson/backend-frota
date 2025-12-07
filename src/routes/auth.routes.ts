import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    loginSchema,
    loginWithTokenSchema,
    generateTokenSchema
} from '../schemas/auth.schemas';

const router = Router();

// Rota de Login (Email/Senha)
router.post('/login', validate(loginSchema), AuthController.login);

// Rota de Login Rápido (Token/QR Code)
router.post('/login-token', validate(loginWithTokenSchema), AuthController.loginWithToken);

// Rota protegida para gerar token (apenas Admin/Encarregado)
router.post(
    '/user/:id/generate-token',
    authenticateToken,
    validate(generateTokenSchema),
    AuthController.generateToken
);

export default router;