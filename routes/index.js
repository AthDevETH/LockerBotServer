const router = require('express').Router();
const authenticateUser = require('../middleware/authenticateUser');

router.use('/api/wallets', authenticateUser, require('./wallets'));
router.use('/api/tokens', authenticateUser, require('./tokens'));
router.use('/api/pairs', authenticateUser, require('./pairs'));

module.exports = router;
