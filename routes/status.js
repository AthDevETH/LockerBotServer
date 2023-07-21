const router = require("express").Router();

/* Gets bot server status public api */
router.get(
  "/live",
  async (req, res) => {
    return res.status(200).json({
      status: 200
    });
  }
);

module.exports = router;