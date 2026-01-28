import { Link } from 'react-router-dom';

function FAQ() {
    const faqSections = [
        {
            id: "technical-indicators",
            title: "Technical Indicators",
            items: [
                {
                    question: "What is RSI (Relative Strength Index)?",
                    answer: "RSI measures the speed and magnitude of price changes. It ranges from 0 to 100. When RSI is above 70, the stock is considered overbought (might be due for a price drop). When RSI is below 30, it's considered oversold (might be due for a price increase). Values between 30–70 are generally considered neutral."
                },
                {
                    question: "What is MACD (Moving Average Convergence Divergence)?",
                    answer: "MACD shows the relationship between two moving averages of a stock's price. It consists of three parts: the MACD line, signal line, and histogram. When the MACD line crosses above the signal line, it's a bullish signal (suggesting upward momentum). When it crosses below, it's a bearish signal (suggesting downward momentum). The histogram shows the difference between the two lines."
                },
                {
                    question: "What are Bollinger Bands?",
                    answer: "Bollinger Bands consist of three lines: an upper band, middle band (moving average), and lower band. They show volatility and relative price levels. When prices touch the upper band, the stock might be overbought; when they touch the lower band, it might be oversold. The bands widen when volatility increases and narrow when it decreases."
                },
                {
                    question: "What are Moving Averages (SMA and EMA)?",
                    answer: "Moving averages smooth out price data to show trends. SMA (Simple Moving Average) is the average price over a set period. EMA (Exponential Moving Average) gives more weight to recent prices. Common periods are 20-day, 50-day, and 200-day. When the current price is above the moving average, it often indicates an uptrend; when below, a downtrend."
                }
            ]
        },
        {
            id: "statistical-analysis",
            title: "Statistical Analysis",
            items: [
                {
                    question: "What is Volatility?",
                    answer: "Volatility measures how much a stock's price fluctuates over time. Higher volatility means larger price swings (more risk but potentially more reward). Lower volatility means smaller, steadier movements. It's typically shown as an annualized percentage."
                },
                {
                    question: "What does Trend Direction mean?",
                    answer: "Trend direction shows whether prices are generally moving up (bullish) or down (bearish) over the selected period, using linear regression. An upward trend suggests positive momentum; a downward trend suggests negative momentum."
                }
            ]
        },
        {
            id: "budgeting",
            title: "Budgeting",
            items: [
                {
                    question: "What is budget tracking?",
                    answer: "TrendTracker helps you track spending by category. Connect your bank accounts (via Plaid) in Settings so transactions are imported automatically. Transactions are categorized so you can see where your money goes. Use the Budget page to set limits and monitor progress."
                },
                {
                    question: "How do I set up budgets?",
                    answer: "Go to the Budget page and click “Add Budget.” Choose a category (e.g. Dining, Shopping, Transport), set a monthly amount, and save. You can have multiple budgets per category. The overview shows total budget, total spent, and what’s left. You can edit or delete budgets from each category card."
                },
                {
                    question: "What are budget alerts?",
                    answer: "Budget alerts notify you when you’re over budget or approaching your limit in a category. Checks run daily at 8 AM. You’ll get an email and, if you’ve added and verified your phone in Settings, an SMS. Alerts mention which categories are over or near their limit and link you to the Budget page."
                },
                {
                    question: "Where do my transactions come from?",
                    answer: "Transactions come from linked bank accounts (Plaid). Link accounts in Settings → Bank accounts. Syncing runs automatically; you can also trigger a sync from the Transactions page. Transactions are grouped by category. You can adjust categories on individual transactions if needed."
                },
                {
                    question: "What’s the difference between Income, Total Spent, and Budget Remaining?",
                    answer: "Income is money coming in (e.g. deposits, paychecks). Total Spent is the sum of your categorized expenses in the period. Budget Remaining is your total budget minus total spent. Net Savings is income minus total spent. The monthly overview uses these to show whether you’re under or over budget overall."
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
                    Technical indicators, statistics, and budgeting in TrendTracker
                </p>
                <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '1rem' }}>
                    {faqSections.map((s) => (
                        <a key={s.id} href={`#${s.id}`} style={{ fontSize: '0.95rem', color: 'var(--primary)', textDecoration: 'none' }}>
                            {s.title}
                        </a>
                    ))}
                </nav>
            </div>

            {faqSections.map((section, sectionIndex) => (
                <div key={section.id || sectionIndex} id={section.id} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
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
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Technical indicators and statistics are tools to inform your decisions, not guarantees of future performance. 
                    Always do your own research. For budgeting, connect your accounts in <Link to="/settings" style={{ color: 'var(--primary)' }}>Settings</Link> and 
                    set up category budgets on the <Link to="/budget" style={{ color: 'var(--primary)' }}>Budget</Link> page.
                </p>
            </div>
        </div>
    );
}

export default FAQ;

