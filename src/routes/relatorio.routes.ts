import { Router } from 'express';
import { RelatorioController } from '../controllers/RelatorioController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/sumario', RelatorioController.sumario);
router.get('/ranking-operadores', RelatorioController.ranking);
router.get('/alertas', RelatorioController.alertas);

export default router;