/**
 * MEYCMAP — Emergency Services Mapping System
 * Landing Page Interactions (Mobile Navigation & Metric Animations)
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initMetricCounters();
  initMobileMenu();
  initSmoothScroll();
});

/**
 * Animated metric counters when scrolled into view
 */
function initMetricCounters() {
  const metricElements = document.querySelectorAll('.metric-number[data-target]');
  if (!metricElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        animateValue(el, 0, target, 1200, prefix, suffix);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  metricElements.forEach(el => observer.observe(el));
}

function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Cubic ease-out
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.floor(easeProgress * (end - start) + start);
    obj.textContent = `${prefix}${currentVal}${suffix}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.textContent = `${prefix}${end}${suffix}`;
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * Mobile navigation menu toggle with backdrop blur & auto-close on link tap
 */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.style.display = 'none';
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.position = 'absolute';
    menu.style.top = '100%';
    menu.style.left = '0';
    menu.style.right = '0';
    menu.style.marginTop = '0.75rem';
    menu.style.background = 'rgba(12, 18, 32, 0.96)';
    menu.style.backdropFilter = 'blur(25px)';
    menu.style.webkitBackdropFilter = 'blur(25px)';
    menu.style.padding = '1.25rem 1.5rem';
    menu.style.borderRadius = '18px';
    menu.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    menu.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.8)';
    menu.style.gap = '1.1rem';
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = menu.style.display === 'flex';
    if (isShown) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close when clicking on any menu link
  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMenu();
      }
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      if (menu.style.display === 'flex' && window.innerWidth <= 768) {
        closeMenu();
      }
    }
  });

  // Reset menu display on window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      menu.style.display = 'flex';
      menu.style.position = 'static';
      menu.style.flexDirection = 'row';
      menu.style.background = 'transparent';
      menu.style.padding = '0';
      menu.style.boxShadow = 'none';
      menu.style.border = 'none';
    } else {
      menu.style.display = 'none';
    }
  });
}

/**
 * Smooth anchor scrolling with header offset
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 90;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}
