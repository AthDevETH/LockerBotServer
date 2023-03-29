const router = require("express").Router();
const validation = require("../middleware/validation");

const config = require("../config");
router.get("/config", validation, async (req, res) => {
  return res.json(config);
});

module.exports = router;
