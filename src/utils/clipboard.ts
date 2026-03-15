/**
 * Secure Clipboard utility with fallback for non-secure contexts (HTTP).
 * navigator.clipboard is only available in Secure Contexts (HTTPS/Localhost).
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 1. Try modern clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 2. Fallback to document.execCommand('copy') for non-secure contexts (HTTP over LAN)
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Ensure the textarea is not visible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return success;
  } catch (err) {
    console.error('[Clipboard] Failed to copy:', err);
    return false;
  }
};
