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

const getShopSales = async (shopName, accessToken, visitDate) => {
  const fromDate = visitDate ? new Date(visitDate) : new Date();
  const toDate = new Date(fromDate);
  toDate.setDate(fromDate.getDate() + 7); // +7 days

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
          date_start: formatDate(fromDate), // ← visit date
          date_end: formatDate(toDate), // ← visit date + 7
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
          date_start: formatDate(fromDate), // ← visit date
          date_end: formatDate(toDate), // ← visit date + 7
        },
      },
    );

    const invoices = invoiceRes.data.invoices || [];
    console.log("📋 FIRST INVOICE =>", JSON.stringify(invoices[0])); // ← இதை add பண்ணுங்க

    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      matched: true,
      zoho_name: customer.contact_name,
      from_date: formatDate(fromDate),
      to_date: formatDate(toDate),
      invoice_count: invoices.length,
      total_sales: totalSales,
      // ✅ Only needed fields
      invoices: invoices.map((inv) => ({
        invoice_number: inv.invoice_number,
        date: inv.date,
        total: inv.total,
        balance: inv.balance,
        status: inv.status,
      })),
    };
  } catch (err) {
    return { matched: false, shop_name: shopName, error: err.message };
  }
};

module.exports = { getAccessToken, getShopSales };
