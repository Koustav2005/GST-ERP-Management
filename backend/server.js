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
app.use('/api/master-customers', require('./routes/master_customers'));
app.use('/api/doc-sequences', require('./routes/doc_sequences'));
app.use('/api/ejw', require('./routes/ejw_inwards'));
app.use('/api/ejw', require('./routes/work_orders'));
app.use('/api/ejw', require('./routes/ejw_ready'));
app.use('/api/ejw', require('./routes/ejw_dispatches'));
app.use('/api/ejw', require('./routes/ejw_print'));
app.use('/api/ejw/reports', require('./routes/ejw_reports'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/external-jobwork-materials', require('./routes/ejw_issue')); // issue to floor (inward items); before the old router
app.use('/api/external-jobwork-materials', require('./routes/external-jobwork-materials'));
app.use('/api/jobwork-dcs', require('./routes/jobwork_stock_requests')); // stock item requests (before the DC router)
app.use('/api/jobwork-dcs', require('./routes/jobwork_dcs'));

app.get('/', (req, res) => {
  res.json({ message: 'GST Management API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Nodemon restart trigger
