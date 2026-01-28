import { safeExternalUrl, safeImageUrl } from '../utils/formatters';

const NewsCard = ({ news }) => {
    const href = safeExternalUrl(news?.url);
    const imgSrc = safeImageUrl(news?.image);
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
            <div className="card glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', transition: 'transform 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                {imgSrc && (
                    <div style={{ height: '150px', overflow: 'hidden' }}>
                        <img src={imgSrc} alt={news.headline || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                        {news.category ? news.category.toUpperCase() : 'NEWS'}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        {news.headline}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {news.summary}
                    </p>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>{news.source}</span>
                        <span>{new Date(news.datetime * 1000).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </a>
    );
};

export default NewsCard;
