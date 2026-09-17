/* newsletter.js - Mailchimp Free Tier Integration */

const Newsletter = (() => {

  const MC_CONFIG = {
    actionUrl: 'https://gmail.us18.list-manage.com/subscribe/post-json',
    u: '2994fda82a85b312923e5e3db',
    id: 'cf94a74a7e',
  };

  function buildUrl(email) {
    const params = new URLSearchParams({
      u: MC_CONFIG.u,
      id: MC_CONFIG.id,
      EMAIL: email,
    });
    return `${MC_CONFIG.actionUrl}?${params.toString()}`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function submit(email) {
    return new Promise((resolve, reject) => {
      if (!isValidEmail(email)) {
        reject('Please enter a valid email address.');
        return;
      }

      const callbackName = 'mc_cb_' + Date.now();
      const script = document.createElement('script');

      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        if (data.result === 'success') {
          resolve(data.msg || 'Subscribed! Check your email to confirm.');
        } else {
          let msg = data.msg || 'Something went wrong.';
          msg = msg.replace(/<[^>]*>/g, '');
          reject(msg);
        }
      };

      script.src = buildUrl(email) + '&c=' + callbackName;
      script.onerror = () => {
        delete window[callbackName];
        reject('Network error. Please try again.');
      };
      document.body.appendChild(script);
    });
  }

  function attachForm(formEl) {
    if (!formEl || formEl.hasAttribute('data-newsletter-attached')) return;
    
    const input = formEl.querySelector('input[type="email"]');
    const btn = formEl.querySelector('button[type="submit"]');
    if (!input || !btn) return;

    formEl.setAttribute('data-newsletter-attached', 'true');

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const email = input.value.trim();
      const originalHTML = btn.innerHTML;

      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subscribing…';
      btn.disabled = true;

      try {
        const msg = await submit(email);
        input.value = '';
        if (typeof Toast !== 'undefined') {
          Toast.show(msg, 'success');
        } else {
          alert(msg);
        }
      } catch (err) {
        if (typeof Toast !== 'undefined') {
          Toast.show(err, 'error');
        } else {
          alert('Error: ' + err);
        }
      } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    });
  }

  function init() {
    document.querySelectorAll('.newsletter-form').forEach(attachForm);
  }

  return { init, attachForm };
})();

// Toast notification system
if (typeof Toast === 'undefined') {
  window.Toast = {
    show: function(message, type) {
      const existingToast = document.querySelector('.custom-toast');
      if (existingToast) existingToast.remove();
      
      const toast = document.createElement('div');
      toast.className = 'custom-toast';
      toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
          <span>${message}</span>
        </div>
        <button style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">&times;</button>
      `;
      
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: system-ui, sans-serif;
      `;
      
      toast.querySelector('button').onclick = () => toast.remove();
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }
  };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Newsletter.init());
} else {
  Newsletter.init();
}