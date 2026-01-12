import { Link } from 'react-router-dom';

function FAQ() {
    const faqSections = [
        {
            title: "Technical Indicators",
            items: [
                {
                    question: "What is RSI (Relative Strength Index)?",
                    answer: "RSI measures the speed and magnitude of price changes. It ranges from 0 to 100. When RSI is above 70, the stock is considered overbought (might be due for a price drop). When RSI is below 30, it's considered oversold (might be due for a price increase). Values between 30-70 are generally considered neutral."
                },
                {
                    question: "What is MACD (Moving Average Convergence Divergence)?",
                    answer: "MACD shows the relationship between two moving averages of a stock's price. It consists of three parts: the MACD line, signal line, and histogram. When the MACD line crosses above the signal line, it's a bullish signal (suggesting upward momentum). When it crosses below, it's a bearish signal (suggesting downward momentum). The histogram shows the difference between the two lines."
                },
                {
                    question: "What are Bollinger Bands?",
                    answer: "Bollinger Bands consist of three lines: an upper band, middle band (moving average), and lower band. They show the volatility and relative price levels. When prices touch the upper band, the stock might be overbought. When prices touch the lower band, it might be oversold. The bands widen when volatility increases and narrow when volatility decreases."
                },
                {
                    question: "What are Moving Averages (SMA and EMA)?",
                    answer: "Moving averages smooth out price data to show trends. SMA (Simple Moving Average) calculates the average price over a set period. EMA (Exponential Moving Average) gives more weight to recent prices. Common periods are 20-day, 50-day, and 200-day. When the current price is above the moving average, it often indicates an uptrend. When below, it indicates a downtrend."
                }
            ]
        },
        {
            title: "Statistical Analysis",
            items: [
                {
                    question: "What is R-squared (R²)?",
                    answer: "R-squared measures how well the price trend fits a straight line. It ranges from 0 to 1 (or 0% to 100%). A higher R² (closer to 1) means the price movement is more consistent and predictable. A lower R² means the price movement is more random. R² helps you understand if the trend is reliable or if there's a lot of noise in the data."
                },
                {
                    question: "What is Volatility?",
                    answer: "Volatility measures how much a stock's price fluctuates over time. Higher volatility means larger price swings (more risk but potentially more reward). Lower volatility means smaller, steadier price movements. Volatility is typically shown as an annualized percentage, representing how much the price might vary in a year."
                },
                {
                    question: "What do Mean, Median, and Standard Deviation mean?",
                    answer: "Mean is the average price over the period. Median is the middle value when prices are sorted. Standard deviation shows how much prices vary from the average - higher values mean more variation. These help you understand if the current price is typical or unusual compared to historical prices."
                },
                {
                    question: "What does Trend Direction mean?",
                    answer: "Trend direction shows whether prices are generally moving up (bullish) or down (bearish) over the selected period. This is calculated using linear regression to find the overall direction. An upward trend suggests positive momentum, while a downward trend suggests negative momentum."
                }
            ]
        },
        {
            title: "Predictions",
            items: [
                {
                    question: "How accurate are the price predictions?",
                    answer: "Our predictions use momentum-based analysis and are estimates, not guarantees. Stock prices are influenced by many factors that can't be predicted with certainty. The confidence percentage shows how reliable the prediction might be based on recent volatility. Always use predictions as one tool among many, not as the sole basis for investment decisions."
                },
                {
                    question: "What does Prediction Confidence mean?",
                    answer: "Confidence is a percentage (0-100%) indicating how reliable the prediction might be. Higher confidence means the model is more certain, usually because there's less volatility in recent price movements. Lower confidence suggests more uncertainty. Remember, even high confidence doesn't guarantee accuracy."
                }
            ]
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/dashboard" className="btn btn-outline" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                    &larr; Back to Dashboard
                </Link>
                <h1 style={{ marginBottom: '0.5rem' }}>Frequently Asked Questions</h1>
                <p className="text-muted" style={{ fontSize: '1.1rem' }}>
                    Learn about the technical indicators and analytics used in TrendTracker
                </p>
            </div>

            {faqSections.map((section, sectionIndex) => (
                <div key={sectionIndex} style={{ marginBottom: '3rem' }}>
                    <h2 style={{ 
                        fontSize: '1.8rem', 
                        marginBottom: '1.5rem', 
                        borderBottom: '2px solid var(--border)', 
                        paddingBottom: '0.5rem' 
                    }}>
                        {section.title}
                    </h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {section.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="card glass-card">
                                <h3 style={{ 
                                    fontSize: '1.3rem', 
                                    marginTop: 0, 
                                    marginBottom: '1rem',
                                    color: 'var(--primary)'
                                }}>
                                    {item.question}
                                </h3>
                                <p style={{ 
                                    margin: 0, 
                                    lineHeight: '1.6', 
                                    fontSize: '1rem',
                                    color: 'var(--text-main)'
                                }}>
                                    {item.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="card glass-card" style={{ marginTop: '3rem', backgroundColor: 'var(--bg-card)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Need More Help?</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Remember that all technical indicators are tools to help inform your decisions, not guarantees of future performance. 
                    Always do your own research and consider multiple factors before making investment decisions.
                </p>
            </div>
        </div>
    );
}

export default FAQ;

