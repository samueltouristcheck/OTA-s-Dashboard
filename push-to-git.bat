@echo off
cd /d "%~dp0"
git init
git remote remove origin 2>nul
git remote add origin https://github.com/samueltouristcheck/OTA-s-Dashboard.git
git add .
git commit -m "Initial commit - OTA Dashboard"
git branch -M main
git push -u origin main
pause
