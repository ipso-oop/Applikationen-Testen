const express = require('express');
const router = express.Router();

const tickets = [
  { id: 1, name: "Einzelticket", price: 2.90 },
  { id: 2, name: "Tagesticket", price: 7.50 },
  { id: 3, name: "Gruppenticket", price: 15.00 }
];

router.get('/', (req, res) => {
  res.render('index', { tickets, message: null });
});

router.post('/buy', (req, res) => {
  const ticketId = parseInt(req.body.ticketId);
  const userName = req.body.name;

  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return res.render('index', { tickets, message: "❌ Ticket nicht gefunden." });
  }

  const confirmation = `✅ ${userName}, Sie haben das "${ticket.name}" für ${ticket.price.toFixed(2)} € gekauft.`;
  res.render('index', { tickets, message: confirmation });
});

module.exports = router;
