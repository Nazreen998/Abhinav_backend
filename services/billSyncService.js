const billRepository = require("../repositories/billRepository");

async function syncBusyBills(busyBills = []) {
  for (const bill of busyBills) {
    await billRepository.upsertBillFromBusy({
      shopId: bill.shopId,
      billNo: bill.billNo,
      billDate: bill.billDate,
      billAmount: bill.billAmount,
      paidAmount: bill.paidAmount || 0,
    });
  }

  return {
    success: true,
    count: busyBills.length,
    message: "BUSY bills synced successfully",
  };
}

module.exports = { syncBusyBills };