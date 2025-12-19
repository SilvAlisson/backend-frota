import { Router } from 'express';
import { FornecedorController } from '../controllers/FornecedorController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { fornecedorSchema } from '../schemas/fornecedor.schemas';

const router = Router();
const fornecedorController = new FornecedorController();

router.use(authenticateToken);

router.post('/', validate(fornecedorSchema), fornecedorController.create);
router.get('/', fornecedorController.list);
router.get('/:id', fornecedorController.getById);
router.put('/:id', validate(fornecedorSchema), fornecedorController.update);
router.delete('/:id', fornecedorController.delete);

export default router;