@echo off
echo Starting Backend Server...
start "AnnotateHub - Backend Server" cmd /k "cd backend && node index.js"

echo Starting Frontend Server...
start "AnnotateHub - Frontend Server" cmd /k "cd frontend && npm run dev"

echo Both servers are starting up!
echo.
echo To turn the servers off later, simply close the two new black windows that just opened.
echo.
pause
