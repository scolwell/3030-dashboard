#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Client from 'ftp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ftpConfig = {
  host: '82.197.80.194',
  user: 'u367490946.thestatisticalmind.com',
  password: 'Sc2024!'
};

const client = new Client();

client.on('error', (err) => {
  console.error('FTP Error:', err);
  process.exit(1);
});

client.on('close', () => {
  console.log('FTP connection closed');
});

client.connect(ftpConfig);

client.on('ready', () => {
  console.log('Connected to FTP server');
  
  const distPath = path.join(__dirname, 'dist');
  
  // Upload index.html
  const indexPath = path.join(distPath, 'index.html');
  console.log(`Uploading ${indexPath}...`);
  
  client.put(indexPath, '/public_html/3030-dashboard/index.html', (err) => {
    if (err) {
      console.error('Error uploading index.html:', err);
      client.end();
      return;
    }
    console.log('✓ index.html uploaded');
    
    // Upload assets
    const assetsDir = path.join(distPath, 'assets');
    const files = fs.readdirSync(assetsDir);
    
    let uploadedCount = 0;
    files.forEach((file) => {
      const filePath = path.join(assetsDir, file);
      const remotePath = `/public_html/3030-dashboard/assets/${file}`;
      
      console.log(`Uploading ${file}...`);
      client.put(filePath, remotePath, (err) => {
        if (err) {
          console.error(`Error uploading ${file}:`, err);
        } else {
          console.log(`✓ ${file} uploaded`);
        }
        
        uploadedCount++;
        if (uploadedCount === files.length) {
          console.log('\n✅ All files uploaded successfully!');
          client.end();
        }
      });
    });
  });
});
