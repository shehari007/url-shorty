/**
 * HTML Templates for error pages
 * Professional, styled error pages matching frontend design
 */
require('dotenv').config();

const getBaseStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    padding: 48px;
    max-width: 500px;
    width: 100%;
    text-align: center;
    animation: fadeIn 0.5s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon svg {
    width: 40px;
    height: 40px;
  }
  .icon-error { background: #fee2e2; }
  .icon-error svg { color: #ef4444; }
  .icon-warning { background: #fef3c7; }
  .icon-warning svg { color: #f59e0b; }
  .icon-blocked { background: #fce7f3; }
  .icon-blocked svg { color: #ec4899; }
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 12px;
  }
  .message {
    color: #6b7280;
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 32px;
  }
  .short-url {
    background: #f3f4f6;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    color: #4b5563;
    margin-bottom: 24px;
    word-break: break-all;
  }
  .btn {
    display: inline-block;
    padding: 14px 28px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }
  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    margin-left: 12px;
  }
  .btn-secondary:hover {
    background: #e5e7eb;
  }
  .footer {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af;
    font-size: 14px;
  }
  .footer a {
    color: #667eea;
    text-decoration: none;
  }
  .footer a:hover {
    text-decoration: underline;
  }
  .report-link {
    margin-top: 16px;
    font-size: 13px;
  }
  .report-link a {
    color: #9ca3af;
  }
`;

const getBaseHTML = (content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Shorty URL</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>">
  <style>${getBaseStyles()}</style>
</head>
<body>
  ${content}
</body>
</html>
`;

/**
 * Link Not Found Page (404)
 */
const notFoundPage = (shortUrl) => {
  const content = `
    <div class="container">
      <div class="icon icon-error">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1>Link Not Found</h1>
      <p class="message">
        Oops! The short link you're looking for doesn't exist or may have been removed.
      </p>
      ${shortUrl ? `<div class="short-url">${shortUrl}</div>` : ''}
      <div>
        <a href="${process.env.HOMEPAGE_LINK}" class="btn btn-primary">Go to Homepage</a>
      </div>
      <div class="footer">
        <p>Powered by <a href="${process.env.HOMEPAGE_LINK}">Shorty URL</a></p>
        <p class="report-link">Think this is a mistake? <a href="${process.env.CONTACTUS_LINK}">Contact us</a></p>
      </div>
    </div>
  `;
  return getBaseHTML(content, 'Link Not Found');
};

/**
 * Link Expired Page (410)
 */
const expiredPage = (shortUrl) => {
  const content = `
    <div class="container">
      <div class="icon icon-warning">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1>Link Expired</h1>
      <p class="message">
        This short link has expired and is no longer active. Short links may expire after a certain period of inactivity.
      </p>
      ${shortUrl ? `<div class="short-url">${shortUrl}</div>` : ''}
      <div>
        <a href="${process.env.HOMEPAGE_LINK}" class="btn btn-primary">Create New Link</a>
      </div>
      <div class="footer">
        <p>Powered by <a href="${process.env.HOMEPAGE_LINK}">Shorty URL</a></p>
        <p class="report-link">Need help? <a href="${process.env.CONTACTUS_LINK}">Contact support</a></p>
      </div>
    </div>
  `;
  return getBaseHTML(content, 'Link Expired');
};

/**
 * Link Blacklisted/Blocked Page (410)
 */
const blacklistedPage = (shortUrl) => {
  const content = `
    <div class="container">
      <div class="icon icon-blocked">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <h1>Link Blocked</h1>
      <p class="message">
        This link has been blocked due to a violation of our Terms of Service. It may contain harmful, malicious, or inappropriate content.
      </p>
      ${shortUrl ? `<div class="short-url">${shortUrl}</div>` : ''}
      <div>
        <a href="${process.env.HOMEPAGE_LINK}" class="btn btn-primary">Go to Homepage</a>
      </div>
      <div class="footer">
        <p>Powered by <a href="${process.env.HOMEPAGE_LINK}">Shorty URL</a></p>
        <p class="report-link">Think this was a mistake? <a href="${process.env.CONTACTUS_LINK}">Appeal this decision</a></p>
      </div>
    </div>
  `;
  return getBaseHTML(content, 'Link Blocked');
};

/**
 * Generic Error Page (500)
 */
const errorPage = (message = 'Something went wrong') => {
  const content = `
    <div class="container">
      <div class="icon icon-error">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1>Oops! Something Went Wrong</h1>
      <p class="message">
        ${message}. Please try again later or contact support if the problem persists.
      </p>
      <div>
        <a href="${process.env.HOMEPAGE_LINK}" class="btn btn-primary">Go to Homepage</a>
        <a href="javascript:location.reload()" class="btn btn-secondary">Try Again</a>
      </div>
      <div class="footer">
        <p>Powered by <a href="${process.env.HOMEPAGE_LINK}">Shorty URL</a></p>
        <p class="report-link">Need help? <a href="${process.env.CONTACTUS_LINK}">Contact support</a></p>
      </div>
    </div>
  `;
  return getBaseHTML(content, 'Error');
};

/**
 * Rate Limited Page (429)
 */
const rateLimitedPage = () => {
  const content = `
    <div class="container">
      <div class="icon icon-warning">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1>Too Many Requests</h1>
      <p class="message">
        You've made too many requests in a short period of time. Please wait a moment and try again.
      </p>
      <div>
        <a href="javascript:location.reload()" class="btn btn-primary">Try Again</a>
        <a href="${process.env.HOMEPAGE_LINK}" class="btn btn-secondary">Go to Homepage</a>
      </div>
      <div class="footer">
        <p>Powered by <a href=${process.env.HOMEPAGE_LINK}>Shorty URL</a></p>
      </div>
    </div>
  `;
  return getBaseHTML(content, 'Too Many Requests');
};

module.exports = {
  notFoundPage,
  expiredPage,
  blacklistedPage,
  errorPage,
  rateLimitedPage,
};
