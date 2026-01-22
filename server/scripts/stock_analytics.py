import yfinance as yf
import pandas as pd
import numpy as np
import json
import sys
from pathlib import Path

# Try to import pytz for timezone conversion, fallback to UTC if not available
try:
    import pytz
    EST = pytz.timezone('US/Eastern')
    HAS_TIMEZONE = True
except ImportError:
    try:
        from zoneinfo import ZoneInfo
        EST = ZoneInfo('America/New_York')
        HAS_TIMEZONE = True
    except (ImportError, Exception):
        HAS_TIMEZONE = False
        EST = None

# Period configurations: (yfinance_period, yfinance_interval)
PERIOD_CONFIG = {
    '1h': ('1d', '1m'),
    '1d': ('1d', '5m'),
    '1w': ('7d', '15m'),
    '1m': ('1mo', '1h'),
    '3m': ('3mo', '1d'),
    '6m': ('6mo', '1d'),
}

def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD (Moving Average Convergence Divergence)"""
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    """Calculate Bollinger Bands"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper_band = sma + (std * std_dev)
    lower_band = sma - (std * std_dev)
    return upper_band, sma, lower_band

def calculate_moving_averages(prices):
    """Calculate Simple and Exponential Moving Averages"""
    sma_20 = prices.rolling(window=20).mean()
    sma_50 = prices.rolling(window=50).mean()
    ema_12 = prices.ewm(span=12, adjust=False).mean()
    ema_26 = prices.ewm(span=26, adjust=False).mean()
    return {
        'sma_20': sma_20,
        'sma_50': sma_50,
        'ema_12': ema_12,
        'ema_26': ema_26
    }

def calculate_statistics(prices):
    """Calculate statistical metrics"""
    return {
        'mean': float(prices.mean()),
        'median': float(prices.median()),
        'std': float(prices.std()),
        'min': float(prices.min()),
        'max': float(prices.max()),
        'percentile_25': float(prices.quantile(0.25)),
        'percentile_75': float(prices.quantile(0.75)),
        'range': float(prices.max() - prices.min()),
        'current': float(prices.iloc[-1]) if len(prices) > 0 else None
    }

def calculate_volatility(prices, window=20):
    """Calculate volatility (rolling standard deviation)"""
    if len(prices) < window:
        return None
    returns = prices.pct_change()
    rolling_vol = returns.rolling(window=window).std() * np.sqrt(252) * 100  # Annualized volatility
    return float(rolling_vol.iloc[-1]) if not pd.isna(rolling_vol.iloc[-1]) else None

def calculate_trend(prices):
    """Simple trend analysis using linear regression"""
    if len(prices) < 2:
        return None
    
    x = np.arange(len(prices))
    y = prices.values
    
    # Linear regression
    coeffs = np.polyfit(x, y, 1)
    slope = coeffs[0]
    
    # Calculate R-squared
    y_pred = np.polyval(coeffs, x)
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    return {
        'slope': float(slope),
        'r_squared': float(r_squared),
        'direction': 'up' if slope > 0 else 'down'
    }

def simple_price_prediction(prices, periods=1):
    """Simple next-day prediction using moving average"""
    if len(prices) < 10:
        return None
    
    # Use exponential moving average for prediction
    ema = prices.ewm(span=10, adjust=False).mean()
    last_ema = ema.iloc[-1]
    last_price = prices.iloc[-1]
    
    # Simple momentum-based prediction
    momentum = (last_price - prices.iloc[-5:].mean()) / prices.iloc[-5:].mean()
    predicted_price = last_price * (1 + momentum * 0.5)
    
    # Confidence based on recent volatility
    recent_std = prices.iloc[-10:].std()
    confidence = max(0, min(100, 100 - (recent_std / last_price * 1000)))
    
    return {
        'predicted_price': float(predicted_price),
        'confidence': float(confidence),
        'method': 'momentum_ema'
    }

def get_stock_analytics(ticker, period='1w'):
    """Main function to calculate all analytics"""
    print(f"DEBUG: get_stock_analytics called with ticker={ticker}, period={period}")
    
    yf_period, yf_interval = PERIOD_CONFIG.get(period, ('7d', '15m'))
    print(f"DEBUG: Using yf_period={yf_period}, yf_interval={yf_interval}")
    
    # Download stock data - suppress timezone warnings
    try:
        df = yf.download(
            tickers=ticker,
            period=yf_period,
            interval=yf_interval,
            auto_adjust=True,
            progress=False
        )
    except Exception as e:
        print(f"Warning: Error during download: {e}")
        # Try again without auto_adjust if it fails
        df = yf.download(
            tickers=ticker,
            period=yf_period,
            interval=yf_interval,
            auto_adjust=False,
            progress=False
        )
    
    if df.empty:
        return json.dumps({'error': 'No data available'})
    
    df = df.reset_index()
    date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
    df = df.rename(columns={date_col: 'Date'})
    df.columns = df.columns.get_level_values(0)
    
    # Handle timezone if present - remove it to avoid issues
    if df['Date'].dt.tz is not None:
        try:
            if HAS_TIMEZONE and EST is not None:
                df['Date'] = df['Date'].dt.tz_convert(EST)
            else:
                # Just remove timezone info if we can't convert
                df['Date'] = df['Date'].dt.tz_localize(None)
        except Exception as e:
            # If timezone conversion fails, remove timezone info
            print(f"Warning: Timezone conversion failed: {e}. Using UTC time.")
            df['Date'] = df['Date'].dt.tz_localize(None)
    
    prices = df['Close']
    
    if len(prices) < 2:
        return json.dumps({'error': 'Insufficient data'})
    
    # Calculate technical indicators
    rsi = calculate_rsi(prices)
    macd_line, signal_line, histogram = calculate_macd(prices)
    bb_upper, bb_middle, bb_lower = calculate_bollinger_bands(prices)
    ma_values = calculate_moving_averages(prices)
    
    # Get latest values
    current_rsi = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
    current_macd = float(macd_line.iloc[-1]) if not pd.isna(macd_line.iloc[-1]) else None
    current_signal = float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None
    current_histogram = float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None
    current_bb_upper = float(bb_upper.iloc[-1]) if not pd.isna(bb_upper.iloc[-1]) else None
    current_bb_middle = float(bb_middle.iloc[-1]) if not pd.isna(bb_middle.iloc[-1]) else None
    current_bb_lower = float(bb_lower.iloc[-1]) if not pd.isna(bb_lower.iloc[-1]) else None
    
    # Calculate statistics
    stats = calculate_statistics(prices)
    volatility = calculate_volatility(prices)
    trend = calculate_trend(prices)
    prediction = simple_price_prediction(prices)
    
    # Moving averages current values
    ma_current = {
        'sma_20': float(ma_values['sma_20'].iloc[-1]) if not pd.isna(ma_values['sma_20'].iloc[-1]) else None,
        'sma_50': float(ma_values['sma_50'].iloc[-1]) if not pd.isna(ma_values['sma_50'].iloc[-1]) else None,
        'ema_12': float(ma_values['ema_12'].iloc[-1]) if not pd.isna(ma_values['ema_12'].iloc[-1]) else None,
        'ema_26': float(ma_values['ema_26'].iloc[-1]) if not pd.isna(ma_values['ema_26'].iloc[-1]) else None
    }
    
    # Build analytics object
    analytics = {
        'technical_indicators': {
            'rsi': {
                'value': current_rsi,
                'signal': 'overbought' if current_rsi and current_rsi > 70 else ('oversold' if current_rsi and current_rsi < 30 else 'neutral')
            },
            'macd': {
                'macd_line': current_macd,
                'signal_line': current_signal,
                'histogram': current_histogram,
                'signal': 'bullish' if current_histogram and current_histogram > 0 else 'bearish'
            },
            'bollinger_bands': {
                'upper': current_bb_upper,
                'middle': current_bb_middle,
                'lower': current_bb_lower,
                'position': 'upper' if stats['current'] and current_bb_upper and stats['current'] > current_bb_upper else ('lower' if stats['current'] and current_bb_lower and stats['current'] < current_bb_lower else 'middle')
            },
            'moving_averages': ma_current
        },
        'statistics': stats,
        'volatility': volatility,
        'trend': trend,
        'prediction': prediction
    }
    
    return json.dumps(analytics, indent=2)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: no ticker provided", file=sys.stderr)
        sys.exit(1)
    
    ticker = sys.argv[1]
    period = sys.argv[2] if len(sys.argv) > 2 else '1w'
    
    try:
        analytics_json = get_stock_analytics(ticker, period)
        
        directory = Path(__file__).resolve().parent
        public_dir = (directory / ".." / "public" / "data").resolve()
        public_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{ticker.lower()}_{period}_analytics.json"
        out_path = public_dir / filename
        
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(analytics_json)
        
        print(f"Analytics for {ticker} saved to {filename}")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

