@echo off
setlocal

set "DEFAULT_SOURCE_DIR=C:\Users\ZhangHB\xwechat_files\wxid_nnto4cx9lqnu22_ba7a\msg\file\2026-04"
set "SOURCE_DIR=%DEFAULT_SOURCE_DIR%"
set "OVERWRITE_ARG="

if not "%~1"=="" (
  if /I "%~1"=="--overwrite" (
    set "OVERWRITE_ARG=-Overwrite"
  ) else (
    set "SOURCE_DIR=%~1"
  )
)

if not "%~2"=="" (
  if /I "%~2"=="--overwrite" (
    set "OVERWRITE_ARG=-Overwrite"
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0embed-kylin-offline-bundle-parts-to-word.ps1" -SourceDir "%SOURCE_DIR%" %OVERWRITE_ARG%
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Failed with exit code: %EXIT_CODE%
)

exit /b %EXIT_CODE%
