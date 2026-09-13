<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
<title>Notifications — Send</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --bg: #14171A;
    --panel: #1C2024;
    --border: #3A3F44;
    --text: #EDEEF0;
    --text-dim: #9AA0A6;
    --blue: #3B6EF2;
    --blue-dim: #172A55;
    --green: #3FA34D;
    --red: #D7263D;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: 20px 20px 16px;
    border-bottom: 3px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  header .agency {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
    letter-spacing: 0.02em;
    margin: 0 0 2px;
  }

  header h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 34px;
    line-height: 1;
    margin: 0;
    letter-spacing: 0.01em;
  }

  header a.switch-link {
    color: var(--blue);
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }

  main {
    flex: 1;
    padding: 20px 20px 150px;
    max-width: 480px;
    width: 100%;
    margin: 0 auto;
  }

  .field {
    margin-bottom: 22px;
  }

  .field label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-dim);
  }

  .field select,
  .field textarea {
    width: 100%;
    background: var(--panel);
    border: 2px solid var(--border);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    padding: 14px 12px;
    border-radius: 2px;
  }

  .field select {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%239AA0A6' stroke-width='2' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
  }

  .field select:focus,
  .field textarea:focus {
    outline: none;
    border-color: var(--blue);
  }

  .field textarea {
    resize: vertical;
    min-height: 140px;
  }

  .ping-note {
    font-size: 13px;
    color: var(--text-dim);
    margin-top: 6px;
  }

  footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--bg) 60%, transparent);
  }

  #sendBtn {
    max-width: 480px;
    margin: 0 auto;
    display: block;
    width: 100%;
    background: var(--blue);
    color: #fff;
    border: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 26px;
    letter-spacing: 0.03em;
    padding: 18px 0;
    border-radius: 2px;
    cursor: pointer;
  }

  #sendBtn:disabled {
    background: var(--border);
    color: var(--text-dim);
  }

  #status {
    max-width: 480px;
    margin: 10px auto 0;
    font-size: 14px;
    text-align: center;
    min-height: 18px;
  }

  #status.ok { color: var(--green); }
  #status.err { color: var(--red); }
</style>
</head>
<body>

<header>
  <div>
    <p class="agency">Blain County Fire — Notifications</p>
    <h1>New Notice</h1>
  </div>
  <a class="switch-link" href="/dispatch.html">Dispatch a call &rarr;</a>
</header>

<main>
  <div class="field">
    <label for="noticeType">Type</label>
    <select id="noticeType">
      <option value="Station Closure">Station Closure</option>
      <option value="Equipment Issue">Equipment Issue</option>
      <option value="General Notice">General Notice</option>
    </select>
  </div>

  <div class="field">
    <label for="message">Message</label>
    <textarea id="message" placeholder="Station 2 bay door is out of service, use Station 1 until further notice..."></textarea>
  </div>

  <p class="ping-note">This will ping @Firefighters when sent — use it for things that need attention, not routine updates.</p>
</main>

<footer>
  <button id="sendBtn">SEND NOTICE</button>
  <p id="status"></p>
</footer>

<script>
  const noticeTypeEl = document.getElementById('noticeType');
  const messageEl = document.getElementById('message');
  const sendBtn = document.getElementById('sendBtn');
  const status = document.getElementById('status');

  sendBtn.addEventListener('click', async () => {
    const noticeType = noticeTypeEl.value;
    const message = messageEl.value.trim();

    if (!message) {
      status.textContent = 'Message is required.';
      status.className = 'err';
      return;
    }

    sendBtn.disabled = true;
    status.textContent = 'Sending...';
    status.className = '';

    try {
      const res = await fetch('/.netlify/functions/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticeType, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      status.textContent = 'Notice sent to Discord.';
      status.className = 'ok';
      messageEl.value = '';
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      status.className = 'err';
    } finally {
      sendBtn.disabled = false;
    }
  });
</script>

</body>
</html>
