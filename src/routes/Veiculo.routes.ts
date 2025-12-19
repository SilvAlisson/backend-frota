import { Router } from 'express';
import { VeiculoController } from '../controllers/VeiculoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { veiculoSchema } from '../schemas/veiculo.schemas';

const router = Router();
const veiculoController = new VeiculoController();

// Middleware de autenticação aplicado a todas as rotas
router.use(authenticateToken);

router.post('/', validate(veiculoSchema), veiculoController.create);
router.get('/', veiculoController.list);
router.get('/:id', veiculoController.getById);
router.put('/:id', validate(veiculoSchema), veiculoController.update);
router.delete('/:id', veiculoController.delete);

export default router;