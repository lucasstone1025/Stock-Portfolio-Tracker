import yfinance as yf
import pandas as pd
import json
import sys

from pathlib import Path

# Try to import pytz for timezone conversion, fallback to UTC if not available
# pytz is more reliable in Docker environments than zoneinfo
HAS_TIMEZONE = False
EST = None
try:
    import pytz
    EST = pytz.timezone('US/Eastern')
    HAS_TIMEZONE = True
except (ImportError, Exception) as e:
    # Don't try zoneinfo as it often fails in Docker
    print(f"Warning: pytz not available: {e}. Timezone conversion disabled.")
    HAS_TIMEZONE = False
    EST = None

# Period configurations: (yfinance_period, yfinance_interval)
PERIOD_CONFIG = {
    '1h': ('1d', '1m'),      # Last day with 5-min intervals (shows ~1 hour of recent data)
    '1d': ('1d', '5m'),      # Last day with 5-min intervals
    '1w': ('7d', '15m'),     # 7 days with 15-min intervals
    '1m': ('1mo', '1h'),     # 1 month with hourly intervals
    '3m': ('3mo', '1d'),     # 3 months with daily intervals
    '6m': ('6mo', '1d'),     # 6 months with daily intervals
}

def get_stock_data(ticker, period='1w'):
    print(f"DEBUG: get_stock_data called with ticker={ticker}, period={period}")

    yf_period, yf_interval = PERIOD_CONFIG.get(period, ('7d', '15m'))
    print(f"DEBUG: Using yf_period={yf_period}, yf_interval={yf_interval}")

    # Suppress timezone warnings from yfinance
    import warnings
    import os
    # Suppress all warnings from yfinance about timezones
    warnings.filterwarnings('ignore')
    # Set environment variable to prevent yfinance from trying to use zoneinfo
    os.environ['TZ'] = 'UTC'
    
    try:
        df = yf.download(
                tickers=ticker,
                period=yf_period,
                interval=yf_interval,
                auto_adjust=True,
                progress=False)
    except Exception as e:
        print(f"Warning: Error during download: {e}")
        # Try again without auto_adjust if it fails
        try:
            df = yf.download(
                    tickers=ticker,
                    period=yf_period,
                    interval=yf_interval,
                    auto_adjust=False,
                    progress=False)
        except Exception as e2:
            print(f"Error: Failed to download data: {e2}")
            return json.dumps({'labels': [], 'data': []})

    if df.empty:
        return json.dumps({'labels': [], 'data': []})
    
    df = df.reset_index()

    date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
    df = df.rename(columns={date_col: 'Date'})
    df.columns = df.columns.get_level_values(0)

    # Convert UTC to EST if timezone support is available
    if df['Date'].dt.tz is not None and HAS_TIMEZONE and EST is not None:
        try:
            df['Date'] = df['Date'].dt.tz_convert(EST)
        except Exception as e:
            # If timezone conversion fails, just remove timezone info
            print(f"Warning: Timezone conversion failed: {e}. Using UTC time.")
            df['Date'] = df['Date'].dt.tz_localize(None)
    elif df['Date'].dt.tz is not None:
        # Remove timezone info if we can't convert
        df['Date'] = df['Date'].dt.tz_localize(None)

    #for 1h slice to show only last hour
    if period == '1h':
        df = df.tail(60)

    #change labels based on period
    if period in ['3m', '6m']:
        labels = df['Date'] = df['Date'].dt.strftime('%Y-%m-%d').tolist()
    elif period == '1h':
        labels = df['Date'].dt.strftime('%H:%M').tolist() #show only time for 1 hour period
    else:
        #show date and time for smaller intervals
        labels = df['Date'].dt.strftime('%Y-%m-%d %H:%M').tolist()
    
    data_points = df['Close'].round(2).tolist()

    chart_data = {'labels': labels, 'data': data_points}

    json_output = json.dumps(chart_data, indent=2)

    return json_output

if __name__ == "__main__":
        
        #get ticker from cmd line arguement

        if len(sys.argv) < 2:
            print("Error no ticker provided")
            sys.exit(1)
        
        ticker = sys.argv[1]
        period = sys.argv[2] if len(sys.argv) > 2 else '1w'  # Default to 1 week

        stock_data_json = get_stock_data(ticker, period)

        directory = Path(__file__).resolve().parent

        public_dir = (directory / ".." / "public" / "data").resolve()
        public_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{ticker.lower()}_{period}_output.json"
        out_path = public_dir / filename

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(stock_data_json)
            
        print(f"Stock data for {ticker} saved to {filename}")