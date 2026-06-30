@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ================================================
echo  WAV → MP3 (128kbps) 일괄 변환
echo  cabinvoice pro/ 하위 모든 .wav 파일 대상
echo ================================================
echo.

set "BASE_DIR=%~dp0cabinvoice pro"
set COUNT=0
set SKIP=0
set FAIL=0

for /r "%BASE_DIR%" %%F in (*.wav) do (
    set "SRC=%%F"
    set "DST=%%~dpnF.mp3"

    if exist "!DST!" (
        echo [SKIP] 이미 존재: %%~nxF
        set /a SKIP+=1
    ) else (
        echo [변환] %%~nxF
        ffmpeg -i "%%F" -codec:a libmp3lame -b:a 128k -y "!DST!" -loglevel error
        if !errorlevel! equ 0 (
            set /a COUNT+=1
        ) else (
            echo [오류] 변환 실패: %%~nxF
            set /a FAIL+=1
        )
    )
)

echo.
echo ================================================
echo  완료: !COUNT!개 변환 / !SKIP!개 건너뜀 / !FAIL!개 실패
echo  원본 .wav 파일은 그대로 유지됩니다.
echo ================================================
pause
