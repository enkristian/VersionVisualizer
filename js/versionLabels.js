// filepath: /Users/kristianhestetun/git/VersionViz/js/versionLabels.js
/**
 * Version label module
 * Adds a centered label to each column showing the version field.
 * Usage: addVersionLabels(root, series, () => currentValidVersion, optionalConfig)
 */
export function addVersionLabels(root, series, getValidVersion, cfg = {}) {
  if (!root || !series) return null;
  const {
    fontSize = 11,
    fontWeight = '600',
    truncate = true,
    minVisibleWidth,
    method = 'auto' // 'auto' | 'template' | 'bullet'
  } = cfg;

  // Prevent double insertion (idempotent)
  if (series.columns?.template?._versionLabelAttached) {
    return series.columns.template._versionLabelAttached;
  }

  const createLabel = () => am5.Label.new(root, {
    text: '{version}',
    centerX: am5.p50,
    centerY: am5.p50,
    fontSize,
    fontWeight,
    populateText: true,
    oversizedBehavior: truncate ? 'truncate' : 'wrap',
    maxWidth: am5.percent(100),
    textAlign: 'center'
  });

  const attachAdapters = (label) => {
    if (!label) return;
    label.adapters.add('fill', (fill, target) => {
      const col = target.parent; if (!col || !col.dataItem) return fill;
      const ctx = col.dataItem.dataContext || {};
      const valid = typeof getValidVersion === 'function' ? getValidVersion() : null;
      return ctx.version === valid ? am5.color('#ffffff') : am5.color('#222222');
    });
    if (minVisibleWidth) {
      label.adapters.add('visible', (visible, target) => {
        const col = target.parent; if (!col) return visible;
        return col.width() > minVisibleWidth;
      });
    }
  };

  const tryTemplateAttach = () => {
    const template = series.columns && series.columns.template;
    if (!template) return false;
    if (template.children && typeof template.children.push === 'function') {
      const label = createLabel();
      template.children.push(label);
      template._versionLabelAttached = label;
      attachAdapters(label);
      return true;
    }
    return false;
  };

  // Bullet fallback approach
  const attachBullets = () => {
    if (series._versionLabelBulletAttached) return series._versionLabelBulletAttached;
    const bulletFactory = (rootRef, dataItem) => {
      const label = createLabel();
      // For bullets, parent is sprite itself so create pseudo parent link to column for adapters
      label.adapters.add('fill', (fill, target) => {
        const col = target.parent; // in bullet case parent is label container; we map via dataItem
        const ctx = dataItem && dataItem.dataContext ? dataItem.dataContext : {};
        const valid = typeof getValidVersion === 'function' ? getValidVersion() : null;
        return ctx.version === valid ? am5.color('#eee') : am5.color('#fff');
      });
      if (minVisibleWidth) {
        label.adapters.add('visible', (visible, target) => {
          const column = dataItem && dataItem.get('graphics');
          if (!column || typeof column.width !== 'function') return visible;
          return column.width() > minVisibleWidth;
        });
      }
      return am5.Bullet.new(rootRef, { sprite: label });
    };
    series.bullets.push((rootRef, dataItem) => bulletFactory(rootRef, dataItem));
    series._versionLabelBulletAttached = true;
    return true;
  };

  if (method === 'bullet') {
    attachBullets();
    return true;
  }

  if (method === 'template' || method === 'auto') {
    let attempts = 0;
    const maxAttempts = 10;
    const iterative = () => {
      if (tryTemplateAttach()) return;
      attempts++;
      if (attempts < maxAttempts) {
        root.events.once('frameended', iterative);
      } else if (method === 'auto') {
        // fallback
        attachBullets();
      }
    };
    iterative();

    // Also ensure after data validation we have labels
    series.events.on('datavalidated', () => {
      if (!series.columns?.template?._versionLabelAttached && !series._versionLabelBulletAttached) {
        if (!tryTemplateAttach()) attachBullets();
      }
    });
  }

  return true;
}
