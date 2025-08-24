const express = require('express');
const app = express();

app.get('/api/slow', (req, res) => {
  // Simuliere langsame Verarbeitung (z. B. Datenbankabfrage)
  setTimeout(() => {
    res.json({ status: 'ok', timestamp: Date.now() });
  }, 200); // 200ms künstliche Verzögerung
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
