const fs = require('fs');
const path = require('path');

// Helper function to fetch the programming quote
async function fetchQuote() {
    try {
        const response = await fetch('https://api.quotable.io/quotes/random?tags=technology');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const quoteObj = Array.isArray(data) ? data[0] : data;
        return `> "${quoteObj.content}"\n> — *${quoteObj.author}*`;
    } catch (error) {
        console.error('Error fetching quote:', error.message);
        return null; // Return null to indicate failure gracefully
    }
}

// Helper function to fetch latest blog posts (using dev.to API as an example)
async function fetchBlogs() {
    try {
        // Change 'devteam' to your actual Dev.to username
        const response = await fetch('https://dev.to/api/articles?username=devteam&per_page=3');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const articles = await response.json();
        
        if (articles.length === 0) {
            return '_No recent articles found._';
        }

        return articles.map(article => `- [${article.title}](${article.url})`).join('\n');
    } catch (error) {
        console.error('Error fetching blogs:', error.message);
        return null;
    }
}

// Helper function to replace content between markers
function updateSection(content, startMarker, endMarker, newText) {
    if (!newText) return content; // Skip replacing if we have no new text (e.g. API failed)
    
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
    if (!regex.test(content)) {
        console.warn(`Warning: Markers not found: ${startMarker}`);
        return content;
    }
    
    return content.replace(
        regex,
        `${startMarker}\n${newText}\n${endMarker}`
    );
}

async function updateReadme() {
    try {
        const readmePath = path.join(__dirname, 'README.md');
        let readmeContent = fs.readFileSync(readmePath, 'utf8');

        // Fetch data concurrently for better performance
        const [quoteText, blogText] = await Promise.all([
            fetchQuote(),
            fetchBlogs()
        ]);

        // Update sections
        readmeContent = updateSection(
            readmeContent,
            '<!-- START_SECTION:quote -->',
            '<!-- END_SECTION:quote -->',
            quoteText
        );
        
        readmeContent = updateSection(
            readmeContent,
            '<!-- START_SECTION:blog -->',
            '<!-- END_SECTION:blog -->',
            blogText
        );

        // Write changes back to file
        fs.writeFileSync(readmePath, readmeContent, 'utf8');
        console.log('README.md updated successfully!');
    } catch (error) {
        // This catch block handles critical file I/O errors
        console.error('Critical Error updating README:', error.message);
        process.exit(1);
    }
}

updateReadme();
