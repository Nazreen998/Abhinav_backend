const express = require("express");
const router = express.Router();
const billController = require("../controllers/billController");

router.get("/test-sql", billController.testSql);
router.post("/setup", billController.setupBillsDb);
router.get("/", billController.getBills);
router.post("/", billController.addBill);
router.post("/sync-busy", billController.syncBillsFromBusy);

module.exports = router;