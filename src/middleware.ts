// Temporarily disable middleware to debug auth issues
// The authentication will be handled at the page level instead

export default function middleware() {
  // Allow all requests to pass through
  return
}

export const config = {
  matcher: []
}