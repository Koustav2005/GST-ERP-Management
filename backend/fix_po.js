const fs = require('fs');

const path = 'c:/Users/Saurabh Kumar/OneDrive/Desktop/GST-SVCEE/gst-management-app/backend/routes/purchase_orders.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /SELECT\s+po\.\*,\s+u\.name\s+as\s+creator_name\s+FROM\s+purchase_orders\s+po\s+LEFT\s+JOIN\s+users\s+u\s+ON\s+po\.created_by\s+=\s+u\.id\s+WHERE\s+po\.company_id\s+=\s+\$1\s+ORDER\s+BY\s+po\.created_at\s+DESC/g;

const replacement = `SELECT po.*, u.name as creator_name, c.name as company_name 
            FROM purchase_orders po 
            LEFT JOIN users u ON po.created_by = u.id 
            LEFT JOIN companies c ON po.company_id = c.id
            WHERE po.company_id = $1 
            ORDER BY po.created_at DESC`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log('Fixed purchase_orders.js');
