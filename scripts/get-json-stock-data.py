import yfinance as yf
import pandas as pd
import json
import sys

from pathlib import Path

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

    df = yf.download(
            tickers=ticker,
            period=yf_period,
            interval=yf_interval)

    if df.empty:
        return json.dumps({'labels': [], 'data': []})
    
    df = df.reset_index()

    date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
    df = df.rename(columns={date_col: 'Date'})
    df.columns = df.columns.get_level_values(0)

    # Convert UTC to EST
    if df['Date'].dt.tz is not None:
        df['Date'] = df['Date'].dt. tz_convert('America/New_York')

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