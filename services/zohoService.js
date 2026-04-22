const axios = require("axios");

const getAccessToken = async () => {
  const response = await axios.post(
    "https://accounts.zoho.in/oauth/v2/token",
    null,
    {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    },
  );
  return response.data.access_token;
};

const getShopSales = async (shopName, accessToken) => {
  const today = new Date();
  const next7 = new Date();
  next7.setDate(today.getDate() + 7);

  const formatDate = (d) => d.toISOString().split("T")[0];

  try {
    // Step 1: Shop name match பண்ணு
    const customerRes = await axios.get(
      "https://www.zohoapis.in/books/v3/contacts",
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: {
          organization_id: process.env.ZOHO_ORG_ID,
          contact_name_contains: shopName,
        },
      },
    );

    const customers = customerRes.data.contacts;
    if (!customers || customers.length === 0) {
      return { matched: false, shop_name: shopName };
    }

    const customer = customers[0];

    // Step 2: Invoices எடு
    const invoiceRes = await axios.get(
      "https://www.zohoapis.in/books/v3/invoices",
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: {
          organization_id: process.env.ZOHO_ORG_ID,
          customer_id: customer.contact_id,
          date_start: formatDate(today),
          date_end: formatDate(next7),
        },
      },
    );

    const invoices = invoiceRes.data.invoices || [];
    console.log("📋 FIRST INVOICE =>", JSON.stringify(invoices[0])); // ← இதை add பண்ணுங்க

    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      matched: true,
      zoho_name: customer.contact_name,
      from_date: formatDate(today),
      to_date: formatDate(next7),
      invoice_count: invoices.length,
      total_sales: totalSales,
      invoices,
    };
  } catch (err) {
    return { matched: false, shop_name: shopName, error: err.message };
  }
};

module.exports = { getAccessToken, getShopSales };
