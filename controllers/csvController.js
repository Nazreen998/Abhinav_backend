const ddb = require("../config/dynamo");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parse/sync"); // npm install csv-parse

const CSV_TABLE = "abhinav_csv_data";

// =====================================================
// UPLOAD & PARSE CSV → DynamoDB save
// MASTER only
// =====================================================
exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file illai" });
    }

    const fileContent = fs.readFileSync(req.file.path, "utf8");

    // CSV parse
    const records = csv.parse(fileContent, {
      columns: true,        // first row = headers
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ message: "CSV empty ah iruku" });
    }

    // DynamoDB batch save
    const savePromises = records.map((row, index) => {
      return ddb.send(new PutCommand({
        TableName: CSV_TABLE,
        Item: {
          id: `${req.user.companyId}_${Date.now()}_${index}`,
          companyId: req.user.companyId,
          companyName: req.user.companyName,
          uploadedBy: req.user.name,
          uploadedAt: new Date().toISOString(),
          ...row, // CSV columns ellam as-is save
        },
      }));
    });

    await Promise.all(savePromises);

    // Temp file delete
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `${records.length} rows uploaded successfully`,
      columns: Object.keys(records[0]),
    });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// =====================================================
// GET CSV DATA
// MASTER + DRIVER both allowed
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