"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/user/userController");
const validation_1 = require("../middleware/validation/validation");
const auth_1 = require("../middleware/auth/auth");
const router = (0, express_1.Router)();
router.get('/profile', auth_1.authenticateJWT, userController_1.getProfile);
router.put('/profile', auth_1.authenticateJWT, (0, validation_1.validateUserUpdate)(), validation_1.handleValidationErrors, userController_1.updateProfile);
router.delete('/account', auth_1.authenticateJWT, userController_1.deleteAccount);
router.get('/:userId', auth_1.authenticateJWT, (0, auth_1.requireRole)(['admin']), userController_1.getUserById);
router.get('/', auth_1.authenticateJWT, (0, auth_1.requireRole)(['admin']), userController_1.getAllUsers);
router.patch('/:userId/status', auth_1.authenticateJWT, (0, auth_1.requireRole)(['admin']), userController_1.updateUserStatus);
router.get('/stats/overview', auth_1.authenticateJWT, (0, auth_1.requireRole)(['admin']), userController_1.getUserStats);
router.get('/search', auth_1.authenticateJWT, (0, auth_1.requireRole)(['admin']), userController_1.searchUsers);
router.get('/export/data', auth_1.authenticateJWT, userController_1.exportUserData);
exports.default = router;
//# sourceMappingURL=user.js.map