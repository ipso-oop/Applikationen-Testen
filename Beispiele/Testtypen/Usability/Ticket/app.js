const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const ticketRoutes = require('./routes/tickets');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Routen
app.use('/', ticketRoutes);

app.listen(PORT, () => {
  console.log(`UI läuft auf http://localhost:${PORT}`);
});
