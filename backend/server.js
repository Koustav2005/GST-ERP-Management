const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const projectsRoutes = require('./routes/projects');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', usersRoutes);
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/master-materials', require('./routes/master_materials'));
app.use('/api/master-vendors', require('./routes/master_vendors'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/external-jobwork-materials', require('./routes/external-jobwork-materials'));

app.get('/', (req, res) => {
  res.json({ message: 'GST Management API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Nodemon restart trigger
