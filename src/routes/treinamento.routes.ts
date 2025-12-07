import { Router } from 'express';
import { TreinamentoController } from '../controllers/TreinamentoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTreinamentoSchema, importTreinamentosSchema } from '../schemas/treinamentos.schemas';

const router = Router();
router.use(authenticateToken);

router.post('/', validate(createTreinamentoSchema), TreinamentoController.create);
router.post('/importar', validate(importTreinamentosSchema), TreinamentoController.importar);
router.get('/usuario/:userId', TreinamentoController.listByUser);
router.delete('/:id', TreinamentoController.delete);

export default router;