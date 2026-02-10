#!/usr/bin/env python3
import ftplib
import os
import sys

def upload_file(ftp, local_path, remote_path):
    """Upload a single file"""
    with open(local_path, 'rb') as f:
        ftp.storbinary(f'STOR {remote_path}', f)

def upload_directory(ftp, local_dir, remote_dir):
    """Recursively upload a directory"""
    # Create remote directory if it doesn't exist
    try:
        ftp.mkd(remote_dir)
    except:
        pass  # Directory might already exist
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if os.path.isfile(local_path):
            upload_file(ftp, local_path, item)
        elif os.path.isdir(local_path):
            ftp.cwd(remote_dir)
            upload_directory(ftp, local_path, item)
            ftp.cwd('..')

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
        
        # Upload new main bundle
        ftp.cwd('/public_html/3030-dashboard/assets')
        with open('dist/assets/index-OEziLmGG.js', 'rb') as f:
            ftp.storbinary('STOR index-OEziLmGG.js', f)
        print("✓ Uploaded index-OEziLmGG.js")
        
        # Upload Story of Uncertainty demo
        ftp.cwd('/public_html/3030-dashboard')
        print("Uploading Story of Uncertainty demo...")
        upload_directory(ftp, 'dist/demos/story-of-uncertainty', 'demos/story-of-uncertainty')
        print("✓ Uploaded Story of Uncertainty")
        
        print("\n✅ Deployment complete!")
        ftp.quit()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    os.chdir('/Users/scott/Documents/_Apps/_Apps-TBC/apps-tbc/3030_app/the-statistical-mind---mcs_3030-dashboard')
    upload_files()
