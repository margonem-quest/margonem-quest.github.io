@echo off
echo ===================================
echo   Uruchamianie Web Symulatora
echo ===================================
echo.

:: Ustawienie katalogu na lokalizację skryptu
cd /d "%~dp0"

:: Sprawdzenie i instalacja wymaganych pakietów Python
echo Sprawdzanie wymaganych pakietów Python...

:: Sprawdz czy mamy pip
python -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Nie znaleziono pip. Upewnij się, że Python jest poprawnie zainstalowany.
    pause
    exit /b 1
)

:: Sprawdz czy websockets jest zainstalowany
python -c "import websockets" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalowanie pakietu websockets...
    python -m pip install websockets
    if %errorlevel% neq 0 (
        echo Błąd podczas instalacji pakietu websockets.
        pause
        exit /b 1
    )
)

:: Sprawdz czy psutil jest zainstalowany
python -c "import psutil" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalowanie pakietu psutil...
    python -m pip install psutil
    if %errorlevel% neq 0 (
        echo Błąd podczas instalacji pakietu psutil.
        pause
        exit /b 1
    )
)

:: Sprawdz czy pyserial i serial.tools są zainstalowane
python -c "import serial; import serial.tools.list_ports" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalowanie pakietu pyserial...
    python -m pip install --upgrade pyserial
    if %errorlevel% neq 0 (
        echo Błąd podczas instalacji pakietu pyserial.
        pause
        exit /b 1
    )
    
    :: Dodatkowe sprawdzenie, czy po instalacji moduł serial.tools jest dostępny
    python -c "import serial.tools.list_ports" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Zainstalowano pyserial, ale podmodul serial.tools nie jest dostępny.
        echo Spróbuj zainstalować pakiet ręcznie: pip install --upgrade --force-reinstall pyserial
        pause
        exit /b 1
    )
)

echo Wszystkie wymagane pakiety są zainstalowane.

:: Uruchomienie serwera Node.js w nowym oknie
echo Uruchamianie serwera Node.js...
start "Web Simulator Server" cmd /c "node server.js"

:: Krótkie opóźnienie, aby serwer Node.js miał czas się uruchomić
timeout /t 2

:: Uruchomienie skryptu Python dla portu szeregowego w nowym oknie
echo Uruchamianie obsługi portu szeregowego...
start "Serial Port Bridge" cmd /c "python serial_simple.py"

:: Uruchomienie serwera logów UDP w nowym oknie
echo Uruchamianie serwera logów UDP...
start "UDP Log Server" cmd /c "python udp_log_server.py --udp-port 8776 --ws-port 8777"

:: Otwarcie przeglądarki z aplikacją
echo Otwieranie aplikacji w przeglądarce...
timeout /t 3
@REM start http://localhost:3000

echo.
echo Wszystkie usługi zostały uruchomione!
echo Zamknij to okno, aby zatrzymać wszystkie usługi.
echo.

:: Oczekuj na naciśnięcie klawisza, aby zatrzymać usługi
pause

:: Zatrzymaj wszystkie uruchomione usługi
echo Zatrzymywanie usług...
taskkill /fi "WindowTitle eq Web Simulator Server*" /f
taskkill /fi "WindowTitle eq Serial Port Bridge*" /f
taskkill /fi "WindowTitle eq UDP Log Server*" /f

echo Zakończono.
