import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/login-token', AuthController.loginWithToken);
// Rota protegida para gerar token (apenas Admin/Encarregado)
router.post('/user/:id/generate-token', authenticateToken, AuthController.generateToken);

export default router;