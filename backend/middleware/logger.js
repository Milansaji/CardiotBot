function requestLogger(req, res, next) {
    // Skip logging for static files and polling
    const skipPaths = ['/sw.js', '/favicon.ico', '/api/contacts', '/api/stats'];
    const shouldSkip = skipPaths.some(path => req.path.includes(path));

    if (!shouldSkip && req.method !== 'OPTIONS') {
        console.log('='.repeat(80));
        console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.path}`);
        console.log(`📍 IP: ${req.ip}`);

        if (req.path.includes('/webhook') || req.path.includes('/api/')) {
            console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));

            if (req.query && Object.keys(req.query).length > 0) {
                console.log(`🔍 Query Params:`, JSON.stringify(req.query, null, 2));
            }

            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
            }
        }

        console.log('='.repeat(80) + '\n');
    }

    next();
}

module.exports = requestLogger;