import { Router } from 'express';
import { ManutencaoController } from '../controllers/ManutencaoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { manutencaoSchema } from '../schemas/operacao.schemas';

const router = Router();
router.use(authenticateToken);

router.post('/', validate(manutencaoSchema), ManutencaoController.create);
router.get('/recentes', ManutencaoController.listRecent);
router.delete('/:id', ManutencaoController.delete);

export default router;