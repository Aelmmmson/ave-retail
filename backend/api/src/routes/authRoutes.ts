import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

export const authRouter = Router();

// Public Authentication
authRouter.post('/signup', AuthController.signup);
authRouter.post('/login', AuthController.login);

// Protected Auth & Administration Routes
authRouter.use(authMiddleware);
authRouter.get('/profile', AuthController.getProfile);
authRouter.patch('/profile', AuthController.updateProfile);
authRouter.get('/branches', AuthController.getBranches);
authRouter.post('/branches', AuthController.createBranch);
authRouter.patch('/branches/:id', AuthController.updateBranch);
authRouter.get('/users', AuthController.getUsers);
authRouter.post('/users', AuthController.createUser);
authRouter.patch('/users/:id', AuthController.updateUser);
authRouter.delete('/users/:id', AuthController.deleteUser);
authRouter.patch('/business', AuthController.updateBusiness);
authRouter.delete('/business', AuthController.deleteBusiness);
