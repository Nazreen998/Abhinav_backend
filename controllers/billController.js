const billRepository = require("../repositories/billRepository");
const { syncBusyBills } = require("../services/billSyncService");

async function testSql(req, res) {
  try {
    const data = await billRepository.testConnection();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function setupBillsDb(req, res) {
  try {
    await billRepository.createTables();
    res.json({ success: true, message: "BusyDummyDB and tables ready" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getBills(req, res) {
  try {
    const data = await billRepository.getAllBills();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function addBill(req, res) {
  try {
    await billRepository.insertBill(req.body);
    res.json({ success: true, message: "Bill added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function syncBillsFromBusy(req, res) {
  try {
    const result = await syncBusyBills(req.body.bills || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  testSql,
  setupBillsDb,
  getBills,
  addBill,
  syncBillsFromBusy,
};