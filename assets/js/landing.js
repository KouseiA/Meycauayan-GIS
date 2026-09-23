/**
 * Meycauayan City Emergency Facility GIS Portal - Landing Page Logic
 * Interactive preview, animated metric counters, and filter controls
 */

document.addEventListener('DOMContentLoaded', () => {
  initMetricCounters();
  initHeroMapPreview();
  initMobileMenu();
  initSmoothScroll();
});

/**
 * Animated metric counters when scrolled into viewport (CARTO style)
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
        animateValue(el, 0, target, 1600, prefix, suffix);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.4 });

  metricElements.forEach(el => observer.observe(el));
}

function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Ease out cubic
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
 * Interactive Hero Map Preview with category filter pills (Felt + Mapbox style)
 */
function initHeroMapPreview() {
  const pillBtns = document.querySelectorAll('.pill-btn[data-filter]');
  const pins = document.querySelectorAll('.sim-pin');
  const chipMain = document.getElementById('hero-proximity-text');
  const chipDist = document.getElementById('hero-proximity-dist');

  const facilityDetails = {
    'meycauayan-doctors': { name: 'Meycauayan Doctors Hospital', dist: '1.2 km away • 4 min' },
    'bfp-station': { name: 'BFP Meycauayan Central Fire Station', dist: '850 m away • 2 min' },
    'city-police': { name: 'PNP Meycauayan Central Headquarters', dist: '1.6 km away • 5 min' },
    'city-hall-evac': { name: 'City Hall Disaster Coordination Center', dist: '600 m away • 2 min' }
  };

  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      pins.forEach(pin => {
        if (filter === 'all' || pin.classList.contains(filter)) {
          pin.style.display = 'flex';
          pin.style.opacity = '1';
          pin.style.transform = 'scale(1)';
        } else {
          pin.style.opacity = '0';
          pin.style.transform = 'scale(0.8)';
          setTimeout(() => {
            if (pin.style.opacity === '0') pin.style.display = 'none';
          }, 200);
        }
      });
    });
  });

  // Pin click feedback
  pins.forEach(pin => {
    pin.addEventListener('click', () => {
      const facilityId = pin.getAttribute('data-id');
      if (facilityDetails[facilityId] && chipMain && chipDist) {
        chipMain.innerHTML = `<i class="fas fa-location-dot text-cyan"></i> ${facilityDetails[facilityId].name}`;
        chipDist.textContent = facilityDetails[facilityId].dist;
        
        // Quick visual pulse
        pin.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.9)';
        setTimeout(() => {
          pin.style.boxShadow = '';
        }, 800);
      }
    });
  });
}

/**
 * Mobile navigation menu toggle
 */
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isShown = menu.style.display === 'flex';
    if (isShown) {
      menu.style.display = 'none';
    } else {
      menu.style.display = 'flex';
      menu.style.flexDirection = 'column';
      menu.style.position = 'absolute';
      menu.style.top = '100%';
      menu.style.left = '0';
      menu.style.right = '0';
      menu.style.marginTop = '0.75rem';
      menu.style.background = 'rgba(13, 19, 34, 0.96)';
      menu.style.backdropFilter = 'blur(20px)';
      menu.style.padding = '1.5rem';
      menu.style.borderRadius = '16px';
      menu.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      menu.style.boxShadow = '0 15px 35px rgba(0,0,0,0.7)';
      menu.style.gap = '1.25rem';
    }
  });
}

/**
 * Smooth anchor scrolling
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}
