/**
 * Street Food Vla — JS admin
 * i18n tabs + gallery drag/drop reorder
 */

(function () {
  'use strict';

  // ─── i18n TABS ───────────────────────────────────────────────────────────
  document.querySelectorAll('.admin-i18n-tabs').forEach((wrapper) => {
    const tabs = wrapper.querySelectorAll('.admin-i18n-tab');
    const panels = wrapper.querySelectorAll('.admin-i18n-panel');

    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = tab.dataset.lang;
        tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.lang === lang));
        panels.forEach((p) => p.classList.toggle('is-active', p.dataset.lang === lang));
      });
    });
  });

  // ─── GALLERY DRAG & DROP ─────────────────────────────────────────────────
  const galleryGrid = document.querySelector('[data-gallery-sortable]');
  if (galleryGrid) {
    let draggedItem = null;

    galleryGrid.querySelectorAll('.admin-gallery-item').forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.outerHTML);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        draggedItem = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === item) return;

        // Détermine si on dépose avant ou après
        const rect = item.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (e.clientX < midX) {
          galleryGrid.insertBefore(draggedItem, item);
        } else {
          galleryGrid.insertBefore(draggedItem, item.nextSibling);
        }

        // Envoie le nouvel ordre au serveur
        saveGalleryOrder();
      });
    });

    function saveGalleryOrder() {
      const order = Array.from(galleryGrid.querySelectorAll('.admin-gallery-item')).map((el) => el.dataset.id);
      fetch('/admin/gallery/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.ok) {
            // Petite indication visuelle (flash temporaire)
            const flash = document.createElement('div');
            flash.className = 'admin-flash';
            flash.textContent = 'Ordre enregistré';
            flash.style.position = 'fixed';
            flash.style.bottom = '1.5rem';
            flash.style.right = '1.5rem';
            flash.style.zIndex = '999';
            flash.style.boxShadow = '0 12px 32px -8px rgba(0,0,0,0.15)';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 2000);
          }
        })
        .catch((err) => console.error('Reorder failed:', err));
    }
  }

  // ─── HOURS : disable times when "closed" is checked ──────────────────────
  document.querySelectorAll('.admin-hours-service').forEach((service) => {
    const closedToggle = service.querySelector('input[type="checkbox"]');
    const timeInputs = service.querySelectorAll('input[type="time"]');

    if (closedToggle && timeInputs.length) {
      const updateState = () => {
        timeInputs.forEach((input) => {
          input.disabled = closedToggle.checked;
          input.style.opacity = closedToggle.checked ? '0.4' : '1';
        });
      };
      closedToggle.addEventListener('change', updateState);
      updateState();
    }
  });

})();
