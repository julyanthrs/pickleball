// Progressive enhancement: keep native selects as the form and application data source.
const controls = new WeakMap();
let active = null, sequence = 0;
const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';

function closeMenu() {
  if (!active) return;
  const { button, menu } = active;
  active = null;
  button.setAttribute('aria-expanded', 'false');
  button.removeAttribute('aria-activedescendant');
  button.removeAttribute('aria-controls');
  menu.remove();
}

function sync(control) {
  const { select, button, value } = control;
  value.textContent = select.selectedOptions[0]?.textContent || 'Choose an option';
  button.disabled = select.disabled;
  button.setAttribute('aria-required', String(select.required));
  if (select.validity.valid) button.removeAttribute('aria-invalid');
}

function highlight(index) {
  if (!active || !active.items.length) return;
  active.index = index;
  active.items.forEach((item, i) => item.classList.toggle('is-highlighted', i === index));
  const item = active.items[index];
  active.button.setAttribute('aria-activedescendant', item.id);
  item.scrollIntoView({ block: 'nearest' });
}

function move(direction) {
  if (!active) return;
  const { items, index } = active;
  for (let step = 1; step <= items.length; step++) {
    const next = (index + direction * step + items.length) % items.length;
    if (items[next].getAttribute('aria-disabled') !== 'true') return highlight(next);
  }
}

function choose(index) {
  if (!active || !active.items[index] || active.items[index].getAttribute('aria-disabled') === 'true') return;
  const { control, button } = active;
  const changed = control.select.selectedIndex !== index;
  control.select.selectedIndex = index;
  sync(control);
  closeMenu();
  button.focus({ preventScroll: true });
  if (changed) {
    control.select.dispatchEvent(new Event('input', { bubbles: true }));
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function openMenu(control) {
  closeMenu();
  sync(control);
  const { select, button } = control;
  if (select.disabled) return;
  const menu = document.createElement('div');
  menu.id = `studio-options-${++sequence}`;
  menu.className = 'studio-select-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', button.getAttribute('aria-label') || select.labels?.[0]?.textContent || button.textContent);
  if (typeof menu.showPopover === 'function') menu.setAttribute('popover', 'manual');
  const items = Array.from(select.options, (option, i) => {
    const item = document.createElement('div');
    item.id = `${menu.id}-${i}`;
    item.className = 'studio-select-option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.selected));
    item.setAttribute('aria-disabled', String(option.disabled || option.parentElement.disabled === true));
    const text = document.createElement('span');
    text.textContent = option.textContent;
    item.append(text);
    if (option.selected) item.insertAdjacentHTML('beforeend', check);
    item.addEventListener('pointerdown', e => e.preventDefault());
    item.addEventListener('click', () => choose(i));
    item.addEventListener('pointermove', () => {
      if (active?.menu === menu && item.getAttribute('aria-disabled') !== 'true') {
        active.index = i;
        items.forEach((entry, n) => entry.classList.toggle('is-highlighted', n === i));
        button.setAttribute('aria-activedescendant', item.id);
      }
    });
    menu.append(item);
    return item;
  });
  (button.closest('dialog') || document.body).append(menu);
  const rect = button.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, 210), window.innerWidth - 24);
  const below = window.innerHeight - rect.bottom - 16;
  const above = rect.top - 16;
  const down = below >= Math.min(items.length * 44 + 12, 280) || below >= above;
  menu.style.width = `${width}px`;
  menu.style.maxHeight = `${Math.max(44, Math.min(320, down ? below : above))}px`;
  menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
  if (menu.hasAttribute('popover')) menu.showPopover();
  menu.style.top = `${down ? rect.bottom + 8 : Math.max(8, rect.top - menu.offsetHeight - 8)}px`;
  active = { control, button, menu, items, index: select.selectedIndex, typed: '', typedAt: 0 };
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', menu.id);
  if (select.selectedIndex >= 0) highlight(select.selectedIndex);
}

function enhance(select) {
  if (controls.has(select) || select.multiple || select.size > 1) return;
  const labels = Array.from(select.labels || []);
  const wrapper = document.createElement('div');
  wrapper.className = 'studio-select' + (select.classList.contains('select-filter') ? ' studio-select-filter' : '');
  select.before(wrapper);
  wrapper.append(select);
  select.classList.add('studio-select-native');
  select.hidden = true;
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  const button = document.createElement('button');
  button.type = 'button';
  button.id = `studio-select-${++sequence}`;
  button.className = 'studio-select-trigger';
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  const label = select.getAttribute('aria-label') || labels.map(l => l.textContent.trim()).join(' ') || 'Choose an option';
  button.setAttribute('aria-label', label);
  if (select.hasAttribute('aria-describedby')) button.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
  labels.forEach(l => { l.htmlFor = button.id; });
  button.innerHTML = '<span class="studio-select-value"></span><span class="studio-select-chevron">' + chevron + '</span>';
  wrapper.append(button);
  const control = { select, button, value: button.querySelector('.studio-select-value') };
  controls.set(select, control);
  sync(control);
  select.addEventListener('change', () => sync(control));
  select.addEventListener('invalid', e => {
    e.preventDefault();
    button.setAttribute('aria-invalid', 'true');
    button.focus();
    openMenu(control);
  });
  select.form?.addEventListener('reset', () => queueMicrotask(() => sync(control)));
  button.addEventListener('focus', () => sync(control));
  button.addEventListener('click', () => active?.button === button ? closeMenu() : openMenu(control));
  button.addEventListener('keydown', e => {
    const isOpen = active?.button === button;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab'].includes(e.key)) {
      if (e.key === 'Tab') { if (isOpen) closeMenu(); return; }
      if (e.key === 'Escape') {
        if (isOpen) { e.preventDefault(); e.stopPropagation(); closeMenu(); }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === ' ') {
        if (isOpen) choose(active.index); else openMenu(control);
        return;
      }
      if (!isOpen) openMenu(control);
      if (e.key === 'Home' || e.key === 'End') {
        active.index = e.key === 'Home' ? active.items.length - 1 : 0;
        move(e.key === 'Home' ? 1 : -1);
      } else if (isOpen) move(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!isOpen) openMenu(control);
      const now = Date.now();
      active.typed = (now - active.typedAt < 700 ? active.typed : '') + e.key.toLocaleLowerCase();
      active.typedAt = now;
      const start = active.index;
      for (let step = 1; step <= active.items.length; step++) {
        const index = (start + step) % active.items.length;
        const item = active.items[index];
        if (item.getAttribute('aria-disabled') !== 'true' && item.textContent.trim().toLocaleLowerCase().startsWith(active.typed)) {
          highlight(index); break;
        }
      }
    }
  });
}

export function installSelectMenus() {
  document.querySelectorAll('select').forEach(enhance);
  new MutationObserver(records => {
    if (active && (!active.button.isConnected || active.button.closest('dialog')?.open === false)) closeMenu();
    for (const record of records) {
      if (record.type === 'attributes') {
        const select = record.target.closest('select');
        if (select && controls.has(select)) sync(controls.get(select));
      }
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches('select')) enhance(node);
        node.querySelectorAll('select').forEach(enhance);
      }
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'required', 'selected', 'open'] });
  document.addEventListener('pointerdown', e => {
    if (active && !active.button.contains(e.target) && !active.menu.contains(e.target)) closeMenu();
  }, true);
  document.addEventListener('focusin', e => {
    if (active && !active.button.contains(e.target) && !active.menu.contains(e.target)) closeMenu();
  });
  document.addEventListener('scroll', e => {
    if (active && !active.menu.contains(e.target)) closeMenu();
  }, true);
  window.addEventListener('resize', closeMenu);
}
