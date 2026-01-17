# TrendTracker Frontend Client

React-based frontend application for TrendTracker - a comprehensive finance management platform.

## 📚 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Components](#components)
- [Pages](#pages)
- [Context](#context)
- [Routing](#routing)
- [API Integration](#api-integration)
- [Styling](#styling)
- [Scripts](#scripts)

## 🎯 Overview

Modern, responsive single-page application (SPA) built with React 19 and Vite. Features include:
- Real-time stock tracking and watchlist management
- Price alerts with email/SMS notifications
- Bank account integration via Plaid
- Budget management and spending analytics
- Interactive charts and data visualizations
- Multi-channel authentication (email/password, Google OAuth)
- Phone number verification

## 🔧 Tech Stack

### Core Framework
- **React 19.2.0** - Latest React with concurrent features and improved hooks
- **React Router v7.10.1** - Client-side routing and navigation
- **Vite 7.2.4** - Next-generation build tool with lightning-fast HMR

### Libraries
- **Axios 1.13.2** - Promise-based HTTP client for API requests
- **Recharts 3.5.1** - Composable charting library for data visualization
- **Plaid Link SDK** - Bank account connection interface (loaded via CDN)

### Development Tools
- **ESLint 9.39.1** - Code linting with React-specific rules
- **@vitejs/plugin-react 5.1.1** - Vite plugin for React Fast Refresh

## 🚀 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:3000`.

## 📁 Project Structure

```
client/
├── public/                      # Static assets
│   ├── icon.svg                 # App icon
│   └── google-logo.svg          # Google OAuth logo
│
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── CategoryManager.jsx  # Budget category management
│   │   ├── CreateAlertModal.jsx # Price alert creation modal
│   │   ├── Navbar.jsx           # Main navigation bar
│   │   ├── NewsCard.jsx         # News article display
│   │   ├── PlaidLink.jsx        # Bank connection component
│   │   ├── SpendingAnalytics.jsx # Budget analytics charts
│   │   └── StockAnalytics.jsx   # Technical indicator charts
│   │
│   ├── context/                 # React Context providers
│   │   └── AuthContext.jsx      # Authentication state management
│   │
│   ├── pages/                   # Page-level components (routes)
│   │   ├── Alerts.jsx           # Price alerts management
│   │   ├── Budget.jsx           # Budget dashboard
│   │   ├── Categories.jsx       # Category management page
│   │   ├── Dashboard.jsx        # User dashboard/home
│   │   ├── FAQ.jsx              # Frequently asked questions
│   │   ├── FindStocks.jsx       # Market overview & discovery
│   │   ├── Login.jsx            # Login page
│   │   ├── Register.jsx         # Registration page
│   │   ├── Search.jsx           # Stock search
│   │   ├── Settings.jsx         # User settings & account management
│   │   ├── StockDetails.jsx     # Individual stock details
│   │   ├── Transactions.jsx     # Transaction history & management
│   │   └── Watchlist.jsx        # Personal watchlist
│   │
│   ├── utils/                   # Utility functions
│   │   └── formatters.js        # Number/date formatting helpers
│   │
│   ├── App.jsx                  # Main app component with routing
│   ├── App.css                  # App-level styles
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
│
├── eslint.config.js             # ESLint configuration
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── vite.config.js               # Vite configuration
└── README.md                    # This file
```

## 🧩 Components

### `Navbar.jsx`
Main navigation component with responsive design.

**Features:**
- Logo and app title
- Navigation links (Dashboard, Watchlist, Budget, Transactions, etc.)
- User menu dropdown
- Logout functionality
- Mobile-responsive hamburger menu

**Props:** None (uses AuthContext)

### `CreateAlertModal.jsx`
Modal component for creating price alerts.

**Features:**
- Stock symbol input with validation
- Direction selector (up/down)
- Target price input
- Notification method selection (email/SMS/both)
- Form validation

**Props:**
```javascript
{
  show: boolean,              // Modal visibility
  onClose: function,          // Close handler
  onAlertCreated: function    // Success callback
}
```

### `NewsCard.jsx`
Displays individual news articles.

**Features:**
- Article headline and summary
- Source and timestamp
- Featured image with fallback
- External link to full article
- Responsive card layout

**Props:**
```javascript
{
  headline: string,
  summary: string,
  url: string,
  source: string,
  datetime: number,           // Unix timestamp
  image: string               // Image URL
}
```

### `StockAnalytics.jsx`
Technical analysis charts and indicators.

**Features:**
- RSI (Relative Strength Index) display
- MACD indicator chart
- Bollinger Bands visualization
- Volatility metrics
- Multiple timeframe support

**Props:**
```javascript
{
  symbol: string,
  period: string              // '1h', '1d', '1w', '1m', '3m', '6m'
}
```

### `PlaidLink.jsx`
Bank account connection interface using Plaid Link.

**Features:**
- Fetches Link token from backend
- Initializes Plaid Link UI
- Handles OAuth flow
- Exchanges public token
- Success/error callbacks
- Loading states

**Props:**
```javascript
{
  onSuccess: function,        // Called after successful connection
  onExit: function            // Called when user exits
}
```

**Usage:**
```jsx
<PlaidLink
  onSuccess={(accounts) => {
    console.log('Connected accounts:', accounts);
    refreshAccounts();
  }}
  onExit={(error) => {
    if (error) console.error(error);
  }}
/>
```

### `SpendingAnalytics.jsx`
Budget analytics dashboard with charts.

**Features:**
- Spending by category (pie chart)
- Monthly spending trends (line chart)
- Budget vs actual comparison (bar chart)
- Color-coded categories
- Interactive tooltips
- Responsive chart sizing

**Props:**
```javascript
{
  userId: number,
  dateRange: {
    start: string,            // ISO date
    end: string               // ISO date
  }
}
```

### `CategoryManager.jsx`
Budget category creation and management.

**Features:**
- List of user and system categories
- Add new category form
- Edit existing categories
- Color picker
- Icon selector
- Delete confirmation
- Transaction count per category

**Props:**
```javascript
{
  onCategoryChange: function  // Callback when categories update
}
```

## 📄 Pages

### `Login.jsx`
User authentication page.
- Email/password login form
- Google OAuth button
- Form validation
- Error messages
- Redirect to dashboard on success
- Link to registration

### `Register.jsx`
New user registration.
- Email, password, first name, phone inputs
- Client-side validation
- Password strength requirements
- Auto-login after registration
- Link to login page

### `Dashboard.jsx`
User home page.
- Welcome message with user's name
- Watchlist count
- Active alerts count
- Budget summary (monthly spend, remaining budget)
- Quick navigation cards
- Market overview snapshot

### `Watchlist.jsx`
Stock watchlist management.
- List of tracked stocks with current prices
- Add/remove stocks
- Inline price refresh
- Create alerts for watchlist stocks
- Filter by market cap (small/mid/large)
- Sort by symbol, price, or market cap
- Real-time price updates

### `StockDetails.jsx`
Detailed stock information.
- Current price, high, low
- Company information
- Interactive price chart with timeframe selector
- Technical analysis (RSI, MACD, Bollinger Bands)
- Company news feed
- Add to watchlist button
- Create alert button

### `Alerts.jsx`
Price alert management.
- List of active alerts
- Alert details (symbol, target, direction, method)
- Current price vs target
- Delete alerts
- Create new alert modal
- Alert status indicators

### `Search.jsx`
Stock search and discovery.
- Symbol search input
- Real-time search results
- Stock details preview
- Add to watchlist
- Create alert
- Recent searches

### `FindStocks.jsx`
Market discovery page.
- Trending stocks
- Top gainers
- Top losers
- Market news feed
- Quick add to watchlist

### `Budget.jsx`
Budget dashboard.
- Overall budget summary
- Monthly spending breakdown
- Budget progress bars by category
- Spending analytics charts
- Budget alert warnings
- Quick actions (add transaction, set budget)
- Link to detailed views

### `Transactions.jsx`
Transaction history and management.
- Paginated transaction list
- Filters (date range, category, account)
- Search by merchant name
- Edit transaction category
- Add notes to transactions
- Manual transaction entry
- Export transactions (future)

### `Categories.jsx`
Budget category management.
- System categories (read-only)
- User custom categories
- Create new category
- Edit category (name, color, icon)
- Delete category (with confirmation)
- Usage statistics per category
- Transaction count display

### `Settings.jsx`
User account settings.
- Email display (read-only)
- First name edit
- Phone number management
- Phone verification flow (SMS code)
- Connected bank accounts list
- Disconnect bank accounts
- Connect new accounts (Plaid Link)
- Change password (future)
- Delete account (future)

### `FAQ.jsx`
Frequently asked questions.
- Collapsible Q&A sections
- Topics: account, stocks, alerts, budget, security
- Contact information
- Support links

## 🔄 Context

### `AuthContext.jsx`
Global authentication state management using React Context.

**Provided Values:**
```javascript
{
  user: {
    id: number,
    email: string,
    first_name: string
  },
  isAuthenticated: boolean,
  loading: boolean,
  login: (email, password) => Promise,
  logout: () => Promise,
  register: (userData) => Promise,
  checkAuth: () => Promise
}
```

**Usage:**
```jsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <div>Welcome, {user.first_name}!</div>;
}
```

## 🛣️ Routing

### Public Routes
```javascript
/               // Home/Landing (redirects to dashboard if authenticated)
/login          // Login page
/register       // Registration page
/faq            // FAQ page
```

### Protected Routes (Require Authentication)
```javascript
/dashboard      // User dashboard
/watchlist      // Stock watchlist
/stock/:symbol  // Individual stock details
/search         // Stock search
/find-stocks    // Market discovery
/alerts         // Price alerts
/budget         // Budget dashboard
/transactions   // Transaction history
/categories     // Category management
/settings       // Account settings
```

### Route Protection
```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return children;
}
```

## 🌐 API Integration

### Base Configuration
```javascript
// axios instance with credentials
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true
});
```

### Example API Calls

**Authentication:**
```javascript
// Login
const response = await axios.post('/api/login', {
  email: 'user@example.com',
  password: 'password123'
}, { withCredentials: true });

// Check auth status
const { data } = await axios.get('/api/user', { withCredentials: true });
```

**Stock Data:**
```javascript
// Get watchlist
const { data } = await axios.get('/api/watchlist', { withCredentials: true });

// Get stock details
const { data } = await axios.get(`/api/stock/${symbol}`, { withCredentials: true });

// Add to watchlist
await axios.post('/api/watchlist/add', stockData, { withCredentials: true });
```

**Budget Management:**
```javascript
// Get transactions
const { data } = await axios.get('/api/transactions', {
  params: { startDate, endDate, categoryId },
  withCredentials: true
});

// Get budget summary
const { data } = await axios.get('/api/budgets/summary', {
  params: { period: 'monthly' },
  withCredentials: true
});

// Create budget
await axios.post('/api/budgets', {
  categoryId: 1,
  amount: 500,
  periodType: 'monthly'
}, { withCredentials: true });
```

**Plaid Integration:**
```javascript
// Get Link token
const { data } = await axios.post('/api/plaid/create-link-token', {}, {
  withCredentials: true
});

// Exchange public token
await axios.post('/api/plaid/exchange-public-token', {
  public_token: token,
  metadata: {}
}, { withCredentials: true });
```

## 🎨 Styling

### Global Styles (`index.css`)
- CSS variables for theming
- Reset styles
- Typography
- Utility classes
- Responsive breakpoints

### Component Styles (`App.css`)
- Component-specific styles
- Layout utilities
- Animation keyframes
- Media queries

### Color Palette
```css
:root {
  --primary: #4f46e5;      /* Indigo */
  --secondary: #06b6d4;    /* Cyan */
  --success: #10b981;      /* Green */
  --warning: #f59e0b;      /* Amber */
  --danger: #ef4444;       /* Red */
  --dark: #1f2937;         /* Gray-800 */
  --light: #f9fafb;        /* Gray-50 */
}
```

### Responsive Breakpoints
```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 640px) { /* Mobile */ }
@media (min-width: 641px) and (max-width: 1024px) { /* Tablet */ }
@media (min-width: 1025px) { /* Desktop */ }
```

## 🔧 Utility Functions

### `formatters.js`

**Currency Formatting:**
```javascript
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};
```

**Date Formatting:**
```javascript
export const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
```

**Number Formatting:**
```javascript
export const formatNumber = (num, decimals = 2) => {
  return Number(num).toFixed(decimals);
};

export const formatLargeNumber = (num) => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};
```

**Percentage Formatting:**
```javascript
export const formatPercent = (value) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};
```

## 📜 Scripts

### Development
```bash
npm run dev
```
Starts Vite dev server with Hot Module Replacement (HMR) at `http://localhost:5173`

### Build
```bash
npm run build
```
Creates optimized production build in `dist/` folder

### Preview
```bash
npm run preview
```
Preview production build locally before deployment

### Lint
```bash
npm run lint
```
Run ESLint to check code quality and catch errors

## ⚙️ Configuration

### `vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

### `eslint.config.js`
ESLint configuration with React-specific rules and best practices.

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Serve Static Files
Copy contents of `dist/` folder to:
- `server/public/` for serving via Express
- CDN or static hosting service (Netlify, Vercel, etc.)

### Environment Variables
For production, update API URLs:
```javascript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-domain.com/api'
  : 'http://localhost:3000/api';
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -ti:5173 | xargs kill -9
```

### CORS Issues
Ensure backend CORS is configured to allow frontend origin.

### Plaid Link Not Loading
Check that Plaid script is loaded in `index.html`:
```html
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
```

### Hot Reload Not Working
- Clear browser cache
- Restart dev server
- Check for syntax errors

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Recharts Documentation](https://recharts.org/)
- [Plaid Link Documentation](https://plaid.com/docs/link/)
- [React Router Documentation](https://reactrouter.com/)

## 📝 License

MIT

---

For full project documentation, see the [main README](../README.md).
