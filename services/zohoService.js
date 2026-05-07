const axios = require("axios");

// ─── Token Cache ───────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = null;

const getAccessToken = async () => {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  try {
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
      }
    );

    const data = response.data;

    // ✅ Zoho returns error in 200 response body — must check explicitly
    if (data.error) {
      throw new Error(`Zoho token error: ${data.error}`);
    }

    if (!data.access_token) {
      throw new Error(`No access token returned. Response: ${JSON.stringify(data)}`);
    }

    cachedToken = data.access_token;
    // Zoho tokens last 3600s; cache for that duration
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

    console.log("✅ Zoho access token refreshed successfully");
    return cachedToken;

  } catch (err) {
    // Log full error for debugging
    const detail = err.response?.data || err.message;
    console.error("❌ ZOHO TOKEN ERROR:", JSON.stringify(detail));
    throw new Error(`Failed to get Zoho access token: ${JSON.stringify(detail)}`);
  }
};

// ─── Get Shop Sales ────────────────────────────────────────
const getShopSales = async (shopName, accessToken, visitDate) => {
  const fromDate = visitDate ? new Date(visitDate) : new Date();
  const toDate = new Date(fromDate);
  toDate.setDate(fromDate.getDate() + 7);

  const formatDate = (d) => d.toISOString().split("T")[0];

  try {
    const customerRes = await axios.get(
      "https://www.zohoapis.in/books/v3/contacts",
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: {
          organization_id: process.env.ZOHO_ORG_ID,
          contact_name_contains: shopName,
          date_start: formatDate(fromDate),
          date_end: formatDate(toDate),
        },
      }
    );

    const customers = customerRes.data.contacts;
    if (!customers || customers.length === 0) {
      return { matched: false, shop_name: shopName };
    }

    const customer = customers[0];

    const invoiceRes = await axios.get(
      "https://www.zohoapis.in/books/v3/invoices",
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: {
          organization_id: process.env.ZOHO_ORG_ID,
          customer_id: customer.contact_id,
          date_start: formatDate(fromDate),
          date_end: formatDate(toDate),
        },
      }
    );

    const invoices = invoiceRes.data.invoices || [];
    console.log("📋 FIRST INVOICE =>", JSON.stringify(invoices[0]));

    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      matched: true,
      zoho_name: customer.contact_name,
      from_date: formatDate(fromDate),
      to_date: formatDate(toDate),
      invoice_count: invoices.length,
      total_sales: totalSales,
      invoices: invoices.map((inv) => ({
        invoice_number: inv.invoice_number,
        date: inv.date,
        total: inv.total,
        balance: inv.balance,
        status: inv.status,
      })),
    };
  } catch (err) {
    // ✅ Log full Zoho error response
    const detail = err.response?.data || err.message;
    console.error("❌ GET SHOP SALES ERROR:", JSON.stringify(detail));
    return { matched: false, shop_name: shopName, error: JSON.stringify(detail) };
  }
};

// ─── Get Sales Orders ──────────────────────────────────────
const getSalesOrders = async () => {
  try {
    const accessToken = await getAccessToken(); // ✅ uses cache + throws on failure

    const response = await axios.get(
      "https://www.zohoapis.in/books/v3/salesorders",
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          organization_id: process.env.ZOHO_ORG_ID,
        },
      }
    );

    // ✅ Zoho Books sometimes returns error in 200 body
    if (response.data.code !== undefined && response.data.code !== 0) {
      throw new Error(`Zoho API error: ${response.data.message}`);
    }

    return (response.data.salesorders || []).map((order) => ({
      salesorder_id: order.salesorder_id,
      salesorder_number: order.salesorder_number,
      customer_name: order.customer_name,
      status: order.status,
      date: order.date,
      total: order.total,
    }));

  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error("❌ SALES ORDER FETCH ERROR:", JSON.stringify(detail));
    throw err;
  }
};

module.exports = { getAccessToken, getShopSales, getSalesOrders };