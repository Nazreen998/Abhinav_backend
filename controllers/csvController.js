const ddb = require("../config/dynamo");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const CSV_TABLE = "abhinav_csv_data";

// =====================================================
// ONE TIME - CSV → DynamoDB import
// Terminal la: node scripts/importCSV.js
// =====================================================

// =====================================================
// GET CSV DATA - MASTER + DRIVER
// =====================================================
exports.getCSVData = async (req, res) => {
  try {
    const result = await ddb.send(new ScanCommand({
      TableName: CSV_TABLE,
      FilterExpression: "companyId = :cid",
      ExpressionAttributeValues: {
        ":cid": req.user.companyId,
      },
    }));

    res.json({
      success: true,
      role: req.user.role,
      count: result.Count,
      data: result.Items || [],
    });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};