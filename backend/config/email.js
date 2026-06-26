const nodemailer = require('nodemailer');

// Create transporter using Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD, // Gmail App Password
        },
    });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    try {
        const transporter = createTransporter();

        // For development, we'll use a simple reset URL
        // In production, this would be your actual frontend URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'GST ERP <noreply@gst-erp.com>',
            to: email,
            subject: 'Password Reset Request - GST ERP',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <p>We received a request to reset your password for your GST ERP account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in <strong>15 minutes</strong></li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password won't change until you create a new one</li>
                </ul>
              </div>
              
              <p>If you're having trouble, please contact your system administrator.</p>
              
              <p>Best regards,<br>GST ERP Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} GST ERP. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
        Password Reset Request
        
        Hello ${userName},
        
        We received a request to reset your password for your GST ERP account.
        
        Click the link below to reset your password:
        ${resetUrl}
        
        This link will expire in 15 minutes.
        
        If you didn't request this reset, please ignore this email.
        
        Best regards,
        GST ERP Team
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);

        // For development: log the reset URL to console if email fails
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📧 Development Mode - Reset URL:');
            console.log(`http://localhost:8081/reset-password?token=${resetToken}`);
            console.log('\n');
        }        throw error;
    }
};

// Send Job Work Challan email to Vendor
const sendJobWorkChallanEmail = async (vendorEmail, jobDetails, items, challanPath, challanName) => {
    try {
        const transporter = createTransporter();
        const path = require('path');
        const fs = require('fs');

        const itemsHtml = items.map(item => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.material_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.hsn || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity} ${item.unit}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'GST ERP <noreply@gst-erp.com>',
            to: vendorEmail,
            subject: `Challan Shared: Job Work - ${jobDetails.job_id}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28A745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #eee; }
            .details-table, .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .details-table td { padding: 6px; }
            .items-table th { background: #eee; padding: 8px; text-align: left; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📋 Job Work Challan Details</h2>
              <h3>Job ID: ${jobDetails.job_id}</h3>
            </div>
            <div class="content">
              <p>Hello Vendor,</p>
              
              <p>Please find below the details of the materials dispatched for job work under Job ID <strong>${jobDetails.job_id}</strong>.</p>
              
              <h4>Vehicle Weight Details:</h4>
              <table class="details-table">
                <tr><td><strong>Loaded Weight:</strong></td><td>${jobDetails.loaded_vehicle_weight} kg</td></tr>
                <tr><td><strong>Unloaded Weight:</strong></td><td>${jobDetails.unloaded_vehicle_weight} kg</td></tr>
                <tr><td><strong>Actual Weight:</strong></td><td><strong>${jobDetails.actual_vehicle_weight} kg</strong></td></tr>
              </table>

              <h4>Dispatched Materials:</h4>
              <table class="items-table" style="width: 100%; border: 1px solid #ddd; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">Material Name</th>
                    <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">HSN</th>
                    <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <p>The signed delivery challan has been attached to this email for your records.</p>
              
              <p>Best regards,<br>GST ERP Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
              Job Work Dispatch Details
              Job ID: ${jobDetails.job_id}
              
              Hello,
              
              Please find the dispatched materials list and vehicle weights for Job ID ${jobDetails.job_id} in the attached challan.
              
              Loaded Weight: ${jobDetails.loaded_vehicle_weight} kg
              Unloaded Weight: ${jobDetails.unloaded_vehicle_weight} kg
              Actual Weight: ${jobDetails.actual_vehicle_weight} kg
              
              Best regards,
              GST ERP Team
            `,
        };

        // Attach challan file if it exists
        const fullPath = path.join(__dirname, '..', challanPath);
        if (fs.existsSync(fullPath)) {
            mailOptions.attachments = [{
                filename: challanName || 'challan.pdf',
                path: fullPath
            }];
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Job Work Challan email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending Job Work Challan email:', error);
        throw error;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendJobWorkChallanEmail,
};
