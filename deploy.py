#!/usr/bin/env python3
import ftplib
import os
import sys

def upload_files():
    ftp = ftplib.FTP('82.197.80.194')
    try:
        ftp.login('u367490946.thestatisticalmind.com', '1@Consult1123')
        print("✓ Connected to FTP server")
        
        ftp.cwd('/public_html/3030-dashboard')
        
        # Upload index.html
        with open('dist/index.html', 'rb') as f:
            ftp.storbinary('STOR index.html', f)
        print("✓ Uploaded index.html")
        
        # Upload main bundle
        ftp.cwd('/public_html/3030-dashboard/assets')
        with open('dist/assets/index-OEziLmGG.js', 'rb') as f:
            ftp.storbinary('STOR index-OEziLmGG.js', f)
        print("✓ Uploaded index-OEziLmGG.js")
        
        # Upload Story of Uncertainty demo
        ftp.cwd('/public_html/3030-dashboard')
        
        # Create demos/story-of-uncertainty directory if it doesn't exist
        try:
            ftp.mkd('demos')
        except:
            pass
        
        try:
            ftp.mkd('demos/story-of-uncertainty')
        except:
            pass
        
        try:
            ftp.mkd('demos/story-of-uncertainty/assets')
        except:
            pass
        
        # Upload Story index.html
        ftp.cwd('/public_html/3030-dashboard/demos/story-of-uncertainty')
        with open('dist/demos/story-of-uncertainty/index.html', 'rb') as f:
            ftp.storbinary('STOR index.html', f)
        print("✓ Uploaded Story index.html")
        
        # Upload Story assets
        ftp.cwd('/public_html/3030-dashboard/demos/story-of-uncertainty/assets')
        with open('dist/demos/story-of-uncertainty/assets/index-BasLjhT8.js', 'rb') as f:
            ftp.storbinary('STOR index-BasLjhT8.js', f)
        print("✓ Uploaded Story asset bundle")
        
        print("\n✅ Deployment complete!")
        ftp.quit()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    os.chdir('/Users/scott/Documents/_Apps/_Apps-TBC/apps-tbc/3030_app/the-statistical-mind---mcs_3030-dashboard')
    upload_files()
