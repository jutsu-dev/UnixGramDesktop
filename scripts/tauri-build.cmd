@echo off
setlocal

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
  echo error: vswhere.exe was not found. Install Visual Studio Build Tools with the Desktop development with C++ workload. 1>&2
  exit /b 1
)

for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSINSTALL=%%i"
if not defined VSINSTALL (
  echo error: the MSVC x64 build tools were not found. Add the Desktop development with C++ workload in the Visual Studio Installer. 1>&2
  exit /b 1
)

call "%VSINSTALL%\Common7\Tools\VsDevCmd.bat" -arch=x64
if errorlevel 1 (
  echo error: VsDevCmd.bat could not initialise the x64 developer environment. 1>&2
  exit /b %errorlevel%
)

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
call npm run tauri:build
exit /b %errorlevel%
