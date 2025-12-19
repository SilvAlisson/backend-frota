import { Router } from 'express';
import { CargoController } from '../controllers/CargoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { cargoSchema, addRequisitoSchema } from '../schemas/cargo.schemas';

const router = Router();
const cargoController = new CargoController()

router.use(authenticateToken);

// Rotas de Cargo
router.post('/', validate(cargoSchema), cargoController.create);
router.get('/', cargoController.list);
router.delete('/:id', cargoController.delete);

// Rotas de Requisitos (Treinamentos)
router.post('/:id/requisitos', validate(addRequisitoSchema), cargoController.addRequisito);
router.delete('/requisitos/:requisitoId', cargoController.removeRequisito);

export default router;