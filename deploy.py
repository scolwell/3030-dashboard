#!/usr/bin/env python3
import ftplib
import os
import sys

def upload_files():
    ftp = ftplib.FTP('82.197.80.194')
    try:
        ftp.login('u367490946.thestatisticalmind.com', 'Sc2024!')
        print("✓ Connected to FTP server")
        
        ftp.cwd('/public_html/3030-dashboard')
        
        # Upload index.html
        with open('dist/index.html', 'rb') as f:
            ftp.storbinary('STOR index.html', f)
        print("✓ Uploaded index.html")
        
        # Upload new bundle
        ftp.cwd('/public_html/3030-dashboard/assets')
        with open('dist/assets/index-BiNH2IBU.js', 'rb') as f:
            ftp.storbinary('STOR index-BiNH2IBU.js', f)
        print("✓ Uploaded index-BiNH2IBU.js")
        
        print("\n✅ Deployment complete!")
        ftp.quit()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    os.chdir('/Users/scott/Documents/_Apps-TBC/apps-tbc/3030_app/the-statistical-mind---mcs_3030-dashboard')
    upload_files()
