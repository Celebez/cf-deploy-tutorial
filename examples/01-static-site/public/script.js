// Demo: fetch dari Worker API (ganti URL dengan Worker kamu setelah deploy example 03)
document.getElementById('ping').addEventListener('click', async () => {
  const out = document.getElementById('out');
  out.textContent = 'Pinging...';

  // Local: pakai Wrangler dev URL
  // Production: ganti dengan Worker URL kamu
  const apiUrl = 'https://cf-worker-api-demo.YOUR_SUBDOMAIN.workers.dev/ping';

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent =
      '⚠️ Gagal ping API. Deploy example 03 dulu, atau ganti URL di script.js.\n\n' +
      'Error: ' + err.message;
  }
});
