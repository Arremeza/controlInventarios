import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createUser, listUsers, deleteUser, updateUser } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate, authorize(['admin']));
router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;


