import { Router } from 'express';
import { CargoController } from '../controllers/CargoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { cargoSchema, addRequisitoSchema } from '../schemas/cargo.schemas';

const router = Router();
router.use(authenticateToken);

router.post('/', validate(cargoSchema), CargoController.create);
router.get('/', CargoController.list);
router.delete('/:id', CargoController.delete);

// Rotas para manipular os requisitos dentro do cargo
router.post('/:id/requisitos', validate(addRequisitoSchema), CargoController.addRequisito);
router.delete('/requisitos/:requisitoId', CargoController.removeRequisito);

export default router;