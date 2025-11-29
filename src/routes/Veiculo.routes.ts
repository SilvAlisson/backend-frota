import { Router } from 'express';
import { VeiculoController } from '../controllers/VeiculoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { veiculoSchema } from '../schemas/veiculo.schemas';

const router = Router();
router.use(authenticateToken);

// Adicionado o middleware validate()
router.post('/', validate(veiculoSchema), VeiculoController.create);
router.put('/:id', validate(veiculoSchema), VeiculoController.update);

router.get('/', VeiculoController.list);
router.get('/:id', VeiculoController.getById);
router.delete('/:id', VeiculoController.delete);

export default router;