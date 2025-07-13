// Temporary utility to handle port 5143 redirects until Supabase config is updated
export function handlePortRedirect() {
  // Check if we're on the wrong port
  if (window.location.port === '5143') {
    // Redirect to correct port while preserving the OAuth hash
    const newUrl = window.location.href.replace(':5143', ':5173');
    console.log('🔀 Redirecting from port 5143 to 5173:', newUrl);
    window.location.replace(newUrl);
    return true;
  }
  return false;
}

// Auto-handle redirect on script load
if (typeof window !== 'undefined') {
  handlePortRedirect();
}