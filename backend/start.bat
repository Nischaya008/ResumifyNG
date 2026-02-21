@echo off
echo Starting ResumifyNG Backend...
cd /d "%~dp0"

IF EXIST ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate
) ELSE IF EXIST "..\.venv\Scripts\activate.bat" (
    call ..\.venv\Scripts\activate
) ELSE (
    echo Virtual environment not found. Please ensure .venv exists in backend or root.
    pause
    exit /b 1
)

uvicorn main:app --reload --host 0.0.0.0 --port 8000
