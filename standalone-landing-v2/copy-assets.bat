@echo off
REM ============================================================
REM LaaS Standalone Landing Page - Asset Copy Script
REM ============================================================
REM This script copies large video files to the assets folder.
REM Video files are 6-14 GB each, so this may take several minutes.
REM ============================================================

echo.
echo LaaS Standalone Landing - Video Asset Copy Script
echo ==================================================
echo.

set "ASSETS_DIR=%~dp0assets"

REM Create assets directory if it doesn't exist
if not exist "%ASSETS_DIR%" (
    echo Creating assets directory...
    mkdir "%ASSETS_DIR%"
)

echo.
echo Copying video files (this may take several minutes)...
echo.

REM Video 1 - Main landing page video
set "SRC1=c:\Users\Punith\LaaS\frontend\public\Image_Assets\hf_20260322_011532_86f9b93a-2ffc-42fd-8735-12a4c55ab536.mp4"
set "DST1=%ASSETS_DIR%\hf_20260322_011532_86f9b93a-2ffc-42fd-8735-12a4c55ab536.mp4"

if exist "%SRC1%" (
    echo [1/2] Copying: hf_20260322_011532_86f9b93a-2ffc-42fd-8735-12a4c55ab536.mp4
    copy /Y "%SRC1%" "%DST1%"
    echo       Done!
) else (
    echo [1/2] WARNING: Source file not found:
    echo       %SRC1%
)

echo.

REM Video 2 - Secondary landing page video
set "SRC2=c:\Users\Punith\LaaS\frontend\public\Image_Assets\hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
set "DST2=%ASSETS_DIR%\hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"

if exist "%SRC2%" (
    echo [2/2] Copying: hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4
    copy /Y "%SRC2%" "%DST2%"
    echo       Done!
) else (
    echo [2/2] WARNING: Source file not found:
    echo       %SRC2%
)

echo.
echo ==================================================
echo Asset copy complete!
echo.
echo Files copied to: %ASSETS_DIR%
echo.
dir /B "%ASSETS_DIR%"
echo ==================================================
pause
