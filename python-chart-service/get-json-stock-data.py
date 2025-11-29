import yfinance as yf
import pandas as pd
import json

from pathlib import Path

def get_stock_data(ticker, interval):
    df = yf.download(
            tickers=ticker,
            period="7d",
            interval=interval)
    
    df = df.reset_index()
    df = df.rename(columns={'Datetime': 'Date'})
    df.columns = df.columns.get_level_values(0)
    
    labels = df['Date'].dt.strftime('%Y-%m-%d %H:%M').tolist()
    data_points = df['Close'].round(2).tolist()

    chart_data = {'labels': labels, 'data': data_points}

    json_output = json.dumps(chart_data, indent=2)

    return json_output

if __name__ == "__main__":
        ticker = "AAPL"
        interval = "15m"
        stock_data_json = get_stock_data(ticker, interval)


        directory = Path(__file__).resolve().parent

        public_dir = (directory / ".." / "public" / "data").resolve()

        filename = f"{ticker.lower()}_output.json"
        out_path = public_dir / filename

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(stock_data_json)
            
        print(f"Stock data for {ticker} saved to {filename}")