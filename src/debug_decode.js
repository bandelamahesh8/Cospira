
try {
    const code = "WSUA15J";
    let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    console.log('Decoded:', decoded);
} catch (e) {
    console.log('Failed to decode');
}
