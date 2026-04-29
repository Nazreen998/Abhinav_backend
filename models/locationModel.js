const ddb = require("../config/dynamo");
const {
  PutCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const TABLE = "abhinav_warehouse_locations";

module.exports = {
  // ✅ Company-ன் all locations fetch
  async getByCompany(companyId) {
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: "LOCATIONS",
        },
      }),
    );
    return res.Item?.locations || [];
  },

  // ✅ புதுசா company-க்கு locations list create
  async create({ companyId, companyName, locations }) {
    return ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `COMPANY#${companyId}`,
          SK: "LOCATIONS",
          companyId,
          companyName,
          locations, // array of locations
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  },

  // ✅ Existing company-க்கு புது location add
  async addLocation({ companyId, location }) {
    return ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: "LOCATIONS",
        },
        UpdateExpression: "SET locations = list_append(locations, :newLoc)",
        ExpressionAttributeValues: {
          ":newLoc": [location],
        },
      }),
    );
  },

  // ✅ Location remove (index தெரிஞ்சா)
  async removeLocation({ companyId, locationIndex }) {
    return ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: "LOCATIONS",
        },
        UpdateExpression: `REMOVE locations[${locationIndex}]`,
      }),
    );
  },
};
