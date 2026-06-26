@echo off
:: ============================================================
::  GST Management - Database Restore Script
::  Run this on the TARGET computer to restore the backup
::  It will ask for credentials at runtime - no editing needed
:: ============================================================

echo.
echo ============================================================
echo   GST Management - Database Restore Tool
echo ============================================================
echo.
echo This script will restore the GST database on THIS computer.
echo You will be asked for your PostgreSQL connection details.
echo (Press ENTER to accept the default value shown in brackets)
echo.

:: Ask for credentials interactively
SET /P PG_HOST=PostgreSQL Host [localhost]: 
IF "%PG_HOST%"=="" SET PG_HOST=localhost

SET /P PG_PORT=PostgreSQL Port [5432]: 
IF "%PG_PORT%"=="" SET PG_PORT=5432

SET /P PG_USER=PostgreSQL Username [postgres]: 
IF "%PG_USER%"=="" SET PG_USER=postgres

SET /P "PGPASSWORD=PostgreSQL Password: "

SET /P PG_DB=Database name to create/restore into [gst_management]: 
IF "%PG_DB%"=="" SET PG_DB=gst_management

echo.
SET /P BACKUP_FILE=Full path to the .sql backup file: 

IF NOT EXIST "%BACKUP_FILE%" (
    echo.
    echo [ERROR] File not found: %BACKUP_FILE%
    echo Please check the path and try again.
    pause
    exit /b 1
)

:: Find pg_dump location
SET PG_BIN=
IF EXIST "C:\Program Files\PostgreSQL\18\bin\psql.exe" SET PG_BIN=C:\Program Files\PostgreSQL\18\bin
IF EXIST "C:\Program Files\PostgreSQL\17\bin\psql.exe" SET PG_BIN=C:\Program Files\PostgreSQL\17\bin
IF EXIST "C:\Program Files\PostgreSQL\16\bin\psql.exe" SET PG_BIN=C:\Program Files\PostgreSQL\16\bin
IF EXIST "C:\Program Files\PostgreSQL\15\bin\psql.exe" SET PG_BIN=C:\Program Files\PostgreSQL\15\bin

:: If not found in common locations, try PATH
IF "%PG_BIN%"=="" (
    WHERE psql >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        SET PG_BIN=
        SET PSQL_CMD=psql
    ) ELSE (
        echo.
        echo [ERROR] psql.exe not found! Make sure PostgreSQL is installed.
        echo Checked: C:\Program Files\PostgreSQL\15-18\bin\
        pause
        exit /b 1
    )
) ELSE (
    SET PSQL_CMD="%PG_BIN%\psql"
)

echo.
echo ============================================================
echo   Settings Summary
echo   Host     : %PG_HOST%:%PG_PORT%
echo   User     : %PG_USER%
echo   Database : %PG_DB%
echo   File     : %BACKUP_FILE%
echo ============================================================
echo.
SET /P CONFIRM=Proceed with restore? (Y/N): 
IF /I NOT "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Step 1: Creating database "%PG_DB%" if it does not exist...
%PSQL_CMD% --host=%PG_HOST% --port=%PG_PORT% --username=%PG_USER% --dbname=postgres -c "SELECT 1 FROM pg_database WHERE datname='%PG_DB%'" | findstr /C:"1 row" >nul
IF ERRORLEVEL 1 (
    %PSQL_CMD% --host=%PG_HOST% --port=%PG_PORT% --username=%PG_USER% --dbname=postgres -c "CREATE DATABASE %PG_DB%;"
    echo Database "%PG_DB%" created.
) ELSE (
    echo Database "%PG_DB%" already exists, skipping creation.
)

echo.
echo Step 2: Restoring data from backup file...
%PSQL_CMD% ^
  --host=%PG_HOST% ^
  --port=%PG_PORT% ^
  --username=%PG_USER% ^
  --dbname=%PG_DB% ^
  --file="%BACKUP_FILE%"

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Database restored successfully!
    echo The GST Management application should now work on this computer.
) ELSE (
    echo.
    echo [NOTICE] Restore completed with some messages above.
    echo   - Errors about duplicate/existing objects are NORMAL if DB was not empty.
    echo   - Look for lines starting with "ERROR:" for real problems.
)

echo.
pause
