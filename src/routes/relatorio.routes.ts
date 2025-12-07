import { Router } from 'express';
import { RelatorioController } from '../controllers/RelatorioController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { relatorioQuerySchema } from '../schemas/relatorio.schemas';

const router = Router();
router.use(authenticateToken);

// Aplicamos o middleware para validar os Query Params (ano, mes)
router.get('/sumario', validate(relatorioQuerySchema), RelatorioController.sumario);
router.get('/ranking-operadores', validate(relatorioQuerySchema), RelatorioController.ranking);

router.get('/alertas', RelatorioController.alertas);

export default router;