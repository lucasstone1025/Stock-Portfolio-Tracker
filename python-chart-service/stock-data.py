import yfinance as yf
import pandas as pd
import json

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
    