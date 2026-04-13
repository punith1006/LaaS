@echo off
echo Copying video assets from main LaaS project...
echo This may take a while due to large file sizes (6-14 GB each).
echo.
if not exist "public\Image_Assets" mkdir "public\Image_Assets"
echo Copying bento grid video...
copy "C:\Users\Punith\LaaS\frontend\public\Image_Assets\hf_20260322_011532_86f9b93a-2ffc-42fd-8735-12a4c55ab536.mp4" "public\Image_Assets\" /Y
echo Copying CTA banner video...
copy "C:\Users\Punith\LaaS\frontend\public\Image_Assets\hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" "public\Image_Assets\" /Y
echo.
echo Done! Video assets copied successfully.
pause
