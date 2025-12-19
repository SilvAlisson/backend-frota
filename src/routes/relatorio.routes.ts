import { Router } from 'express';
import { RelatorioController } from '../controllers/RelatorioController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { relatorioQuerySchema } from '../schemas/relatorio.schemas';

const router = Router();
const relatorioController = new RelatorioController();

router.use(authenticateToken);

// Adicionado middleware 'validate' para garantir tipos de Query Params (ano, mes)
router.get('/sumario', validate(relatorioQuerySchema), relatorioController.sumario);
router.get('/ranking', validate(relatorioQuerySchema), relatorioController.ranking);
router.get('/lavagens', relatorioController.getRelatorioLavagens);
// Alertas não precisa de input complexo, apenas filtro interno
router.get('/alertas', relatorioController.alertas);

export default router;