import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createUser, listUsers, deleteUser } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate, authorize(['admin']));
router.get('/', listUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);

export default router;


