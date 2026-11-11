/**
 * Detects an expired app session and sends the user back to login once.
 */

const EXPIRED_PATTERN = /jwt|expired|PGRST30[1-3]/i;

export function isSessionExpiredResponse(status, body) {
  if (status !== 401) return false;
  if (!body) return true;
  return EXPIRED_PATTERN.test(`${body.code || ''} ${body.message || ''}`);
}

export function createSessionExpiryHandler({ clearSession, notify, redirect, loginUrl }) {
  let running = null;
  return function handleSessionExpired() {
    if (running) return running;
    running = (async () => {
      clearSession();
      try {
        await notify();
      } catch (error) {
        console.warn('[session] notify failed', error);
      }
      redirect(loginUrl());
    })();
    return running;
  };
}

export function createBrowserSessionExpiryHandler() {
  return createSessionExpiryHandler({
    clearSession: () => {
      try {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('madisAccessToken');
      } catch (error) {
        console.warn('[session] clear failed', error);
      }
    },
    notify: () => {
      const message = 'Sesi Anda sudah berakhir. Silakan login kembali.';
      if (window.Swal) {
        return window.Swal.fire({ icon: 'warning', title: 'Sesi Berakhir', text: message, confirmButtonText: 'Login' });
      }
      window.alert(message);
      return Promise.resolve();
    },
    redirect: target => window.location.replace(target),
    loginUrl: () => (window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html')
  });
}
