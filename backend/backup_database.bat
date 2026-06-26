@echo off
:: ============================================================
::  GST Management - Full Database Backup Script
::  Includes: Tables, Data, Indexes, Constraints, Functions
:: ============================================================

SET PGPASSWORD=admin123
SET PG_BIN=C:\Program Files\PostgreSQL\18\bin
SET PG_HOST=localhost
SET PG_PORT=5433
SET PG_DB=gst_management
SET PG_USER=postgres

:: Output folder (same directory as this script)
SET BACKUP_DIR=%~dp0backups

:: Create backup folder if it doesn't exist
IF NOT EXIST "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Timestamped filename
FOR /F "tokens=1-5 delims=/:. " %%a IN ("%DATE% %TIME%") DO (
    SET TIMESTAMP=%%c%%b%%a_%%d%%e
)
SET BACKUP_FILE=%BACKUP_DIR%\gst_management_backup_%TIMESTAMP%.sql

echo.
echo ============================================================
echo   GST Management Database Backup
echo   Database : %PG_DB%
echo   Host     : %PG_HOST%:%PG_PORT%
echo   Output   : %BACKUP_FILE%
echo ============================================================
echo.

:: Run pg_dump — full backup (schema + data + indexes + constraints + functions)
"%PG_BIN%\pg_dump" ^
  --host=%PG_HOST% ^
  --port=%PG_PORT% ^
  --username=%PG_USER% ^
  --dbname=%PG_DB% ^
  --format=plain ^
  --schema=public ^
  --no-owner ^
  --no-acl ^
  --verbose ^
  --file="%BACKUP_FILE%"

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Backup saved to:
    echo   %BACKUP_FILE%
    echo.
    echo You can now copy this .sql file to the other computer
    echo and restore it using restore_database.bat
) ELSE (
    echo.
    echo [ERROR] Backup failed! Make sure:
    echo   1. PostgreSQL is running
    echo   2. pg_dump is in your PATH  (PostgreSQL\bin)
    echo   3. The credentials in this script are correct
)

echo.
pause
