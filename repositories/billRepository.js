const { getSqlPool, sql } = require("../config/sql");

async function testConnection() {
  const pool = await getSqlPool();
  const result = await pool.request().query("SELECT GETDATE() AS time");
  return result.recordset;
}

async function createDatabaseIfNotExists() {
  const pool = await getSqlPool();
  await pool.request().query(`
    IF DB_ID('BusyDummyDB') IS NULL
    CREATE DATABASE BusyDummyDB
  `);
}

async function createTables() {
  const pool = await getSqlPool();

  await pool.request().query(`
    IF DB_ID('BusyDummyDB') IS NULL
    CREATE DATABASE BusyDummyDB
  `);

  await pool.request().query(`
    USE BusyDummyDB;

    IF OBJECT_ID('Shops', 'U') IS NULL
    CREATE TABLE Shops (
      ShopID INT IDENTITY(1,1) PRIMARY KEY,
      GSTIN VARCHAR(15) UNIQUE,
      ShopName VARCHAR(150),
      AddressLine VARCHAR(255),
      City VARCHAR(100),
      StateName VARCHAR(100),
      Pincode VARCHAR(10)
    );

    IF OBJECT_ID('Bills', 'U') IS NULL
    CREATE TABLE Bills (
      BillID INT IDENTITY(1,1) PRIMARY KEY,
      ShopID INT,
      BillNo VARCHAR(50) UNIQUE,
      BillDate DATE,
      BillAmount DECIMAL(10,2),
      PaidAmount DECIMAL(10,2),
      Source VARCHAR(50) DEFAULT 'MANUAL',
      LastSyncAt DATETIME NULL
    );
  `);
}

async function getAllBills() {
  const pool = await getSqlPool();
  const result = await pool.request().query(`
    USE BusyDummyDB;

    SELECT 
      BillID,
      ShopID,
      BillNo,
      BillDate,
      BillAmount,
      PaidAmount,
      (BillAmount - PaidAmount) AS Outstanding,
      CASE 
        WHEN (BillAmount - PaidAmount) > 0 THEN 'Outstanding'
        ELSE 'Completed'
      END AS Status,
      Source,
      LastSyncAt
    FROM Bills
    ORDER BY BillDate DESC
  `);
  return result.recordset;
}

async function getBillsByShopId(shopId) {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("shopId", sql.Int, shopId)
    .query(`
      USE BusyDummyDB;

      SELECT 
        BillID,
        ShopID,
        BillNo,
        BillDate,
        BillAmount,
        PaidAmount,
        (BillAmount - PaidAmount) AS Outstanding,
        CASE 
          WHEN (BillAmount - PaidAmount) > 0 THEN 'Outstanding'
          ELSE 'Completed'
        END AS Status
      FROM Bills
      WHERE ShopID = @shopId
      ORDER BY BillDate DESC
    `);

  return result.recordset;
}

async function insertBill({ shopId, billNo, billDate, billAmount, paidAmount, source = "MANUAL" }) {
  const pool = await getSqlPool();
  await pool
    .request()
    .input("shopId", sql.Int, shopId)
    .input("billNo", sql.VarChar(50), billNo)
    .input("billDate", sql.Date, billDate)
    .input("billAmount", sql.Decimal(10, 2), billAmount)
    .input("paidAmount", sql.Decimal(10, 2), paidAmount)
    .input("source", sql.VarChar(50), source)
    .query(`
      USE BusyDummyDB;

      INSERT INTO Bills (ShopID, BillNo, BillDate, BillAmount, PaidAmount, Source, LastSyncAt)
      VALUES (@shopId, @billNo, @billDate, @billAmount, @paidAmount, @source, GETDATE())
    `);
}

async function upsertBillFromBusy({ shopId, billNo, billDate, billAmount, paidAmount }) {
  const pool = await getSqlPool();

  await pool
    .request()
    .input("shopId", sql.Int, shopId)
    .input("billNo", sql.VarChar(50), billNo)
    .input("billDate", sql.Date, billDate)
    .input("billAmount", sql.Decimal(10, 2), billAmount)
    .input("paidAmount", sql.Decimal(10, 2), paidAmount)
    .query(`
      USE BusyDummyDB;

      IF EXISTS (SELECT 1 FROM Bills WHERE BillNo = @billNo)
      BEGIN
        UPDATE Bills
        SET 
          ShopID = @shopId,
          BillDate = @billDate,
          BillAmount = @billAmount,
          PaidAmount = @paidAmount,
          Source = 'BUSY',
          LastSyncAt = GETDATE()
        WHERE BillNo = @billNo
      END
      ELSE
      BEGIN
        INSERT INTO Bills (ShopID, BillNo, BillDate, BillAmount, PaidAmount, Source, LastSyncAt)
        VALUES (@shopId, @billNo, @billDate, @billAmount, @paidAmount, 'BUSY', GETDATE())
      END
    `);
}

module.exports = {
  testConnection,
  createDatabaseIfNotExists,
  createTables,
  getAllBills,
  getBillsByShopId,
  insertBill,
  upsertBillFromBusy,
};