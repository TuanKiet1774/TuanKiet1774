const fs = require('fs');
const path = require('path');

// ==================== CẤU HÌNH TẬP TRUNG ====================
const CONFIG = {
    DEVTO_USERNAME: 'devteam', // Thay bằng username Dev.to của bạn
    BLOG_LIMIT: 3,
    API_TIMEOUT: 6000, // Timeout 6s tránh treo GitHub Actions
    MARKERS: {
        QUOTE: { start: '<!-- START_SECTION:quote -->', end: '<!-- END_SECTION:quote -->' },
        BLOG: { start: '<!-- START_SECTION:blog -->', end: '<!-- END_SECTION:blog -->' },
        TIMESTAMP: { start: '<!-- START_SECTION:updated -->', end: '<!-- END_SECTION:updated -->' }
    }
};

// ==================== TIỆN ÍCH HỖ TRỢ ====================
// Fetch an toàn kèm timeout
async function fetchWithTimeout(url, timeoutMs = CONFIG.API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

// Định dạng ngày (Ví dụ: "Nov 10, 2026")
function formatDate(isoString) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).format(new Date(isoString));
}

// ==================== XỬ LÝ DỮ LIỆU VÀ GIAO DIỆN ====================
// 1. Trích dẫn công nghệ: Định dạng blockquote đôi sang trọng
async function fetchQuote() {
    try {
        const data = await fetchWithTimeout('https://api.quotable.io/quotes/random?tags=technology');
        const quote = Array.isArray(data) ? data[0] : data;
        
        return [
            `> 💡 *"${quote.content}"*`,
            `>`,
            `> &mdash; **${quote.author}**`
        ].join('\n');
    } catch (error) {
        console.error('⚠️ [Quote] Lỗi tải dữ liệu:', error.message);
        return null;
    }
}

// 2. Danh sách bài viết: Định dạng thẻ list hiện đại kèm badge ngày và reading time
async function fetchBlogs() {
    try {
        const url = `https://dev.to/api/articles?username=${CONFIG.DEVTO_USERNAME}&per_page=${CONFIG.BLOG_LIMIT}`;
        const articles = await fetchWithTimeout(url);

        if (!articles || articles.length === 0) {
            return '> 📭 _Chưa có bài viết mới gần đây._';
        }

        return articles.map(art => {
            const dateStr = formatDate(art.published_at);
            const readTime = art.reading_time_minutes ? `· ⏱️ ${art.reading_time_minutes} min read` : '';
            return `- 📝 [**${art.title}**](${art.url}) \`${dateStr}\` ${readTime}`;
        }).join('\n');
    } catch (error) {
        console.error('⚠️ [Blog] Lỗi tải dữ liệu:', error.message);
        return null;
    }
}

// Thay thế nội dung an toàn giữa 2 thẻ đánh dấu
function updateSection(content, startMarker, endMarker, newText) {
    if (!newText) return content;
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
    if (!regex.test(content)) {
        console.warn(`⚠️ Bỏ qua: Không tìm thấy marker ${startMarker}`);
        return content;
    }
    return content.replace(regex, `${startMarker}\n${newText}\n${endMarker}`);
}

// ==================== HÀM CHẠY CHÍNH ====================
async function updateReadme() {
    try {
        const readmePath = path.join(__dirname, 'README.md');
        let content = fs.readFileSync(readmePath, 'utf8');

        console.log('🚀 Đang đồng bộ dữ liệu...');
        const [quoteText, blogText] = await Promise.all([
            fetchQuote(),
            fetchBlogs()
        ]);

        // Cập nhật Quote
        content = updateSection(content, CONFIG.MARKERS.QUOTE.start, CONFIG.MARKERS.QUOTE.end, quoteText);

        // Cập nhật Blog
        content = updateSection(content, CONFIG.MARKERS.BLOG.start, CONFIG.MARKERS.BLOG.end, blogText);

        // Cập nhật mốc thời gian tự động (Tùy chọn)
        const now = new Date().toISOString().split('T')[0];
        const updateBadge = `*Last updated: \`${now}\`*`;
        content = updateSection(content, CONFIG.MARKERS.TIMESTAMP.start, CONFIG.MARKERS.TIMESTAMP.end, updateBadge);

        fs.writeFileSync(readmePath, content, 'utf8');
        console.log('✅ README.md đã được cập nhật thành công!');
    } catch (error) {
        console.error('❌ Lỗi nghiêm trọng:', error.message);
        process.exit(1);
    }
}

updateReadme();
