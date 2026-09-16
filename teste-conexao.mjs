const url = "https://partner.shopeemobile.com/api/v2/order/get_order_list";

try {
  const resp = await fetch(url);
  console.log("HTTP", resp.status);
  console.log(await resp.text());
} catch (e) {
  console.log("FALHOU:", e.message);
}