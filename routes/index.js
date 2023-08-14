const router = require('express').Router();
const authenticateUser = require('../middleware/authenticateUser');

router.use('/api/wallets', authenticateUser, require('./wallets'));
router.use('/api/tokens', authenticateUser, require('./tokens'));
router.use('/api/pairs', authenticateUser, require('./pairs'));
router.use('/api/config', authenticateUser, require('./config'));
router.use('/api/channels', authenticateUser, require('./channels'));
router.use('/api/slippages', authenticateUser, require('./slippages'));
router.use('/api/status', require('./status'));

module.exports = router;
