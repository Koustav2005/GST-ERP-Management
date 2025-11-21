const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'GST Management API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
