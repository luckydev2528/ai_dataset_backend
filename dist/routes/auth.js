"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', (0, validation_1.validateRegistration)(), validation_1.handleValidationErrors, authController_1.register);
router.post('/login', (0, validation_1.validateLogin)(), validation_1.handleValidationErrors, authController_1.login);
router.post('/social', (0, validation_1.validateSocialAuth)(), validation_1.handleValidationErrors, authController_1.socialAuth);
router.post('/password-reset', (0, validation_1.validatePasswordReset)(), validation_1.handleValidationErrors, authController_1.sendPasswordReset);
router.post('/password-reset/confirm', (0, validation_1.validatePasswordResetConfirm)(), validation_1.handleValidationErrors, authController_1.confirmPasswordReset);
router.post('/refresh', auth_1.authenticateJWT, authController_1.refreshToken);
router.post('/logout', auth_1.authenticateJWT, authController_1.logout);
router.get('/profile', auth_1.authenticateJWT, authController_1.getProfile);
router.post('/verify', authController_1.verifyToken);
exports.default = router;
//# sourceMappingURL=auth.js.map