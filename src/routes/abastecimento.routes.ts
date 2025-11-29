import { Router } from 'express';
import { AbastecimentoController } from '../controllers/AbastecimentoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { abastecimentoSchema } from '../schemas/operacao.schemas';

const router = Router();
router.use(authenticateToken);

router.post('/', validate(abastecimentoSchema), AbastecimentoController.create);
router.get('/recentes', AbastecimentoController.listRecent);
router.delete('/:id', AbastecimentoController.delete);

export default router;