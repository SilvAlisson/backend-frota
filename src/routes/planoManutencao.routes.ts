import { Router } from 'express';
import { PlanoManutencaoController } from '../controllers/PlanoManutencaoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { planoManutencaoSchema } from '../schemas/planoManutencao.schemas';

const router = Router();
const controller = new PlanoManutencaoController();

router.use(authenticateToken);

router.post('/', validate(planoManutencaoSchema), controller.create);
router.get('/', controller.list);
router.delete('/:id', controller.delete);

export default router;