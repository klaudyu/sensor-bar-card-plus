const { test, expect } = require('@playwright/test');

function sensor(state, {
  friendly_name,
  icon = 'mdi:flash',
  unit_of_measurement = 'W',
} = {}) {
  return {
    state: String(state),
    attributes: {
      friendly_name,
      icon,
      unit_of_measurement,
    },
  };
}

const baseStates = {
  'sensor.main_positive': sensor(95, { friendly_name: 'Main positive' }),
  'sensor.main_negative': sensor(-95, { friendly_name: 'Main negative', icon: 'mdi:minus-circle-outline' }),
  'sensor.target_dynamic': sensor(60, { friendly_name: 'Dynamic target', icon: 'mdi:bullseye-arrow' }),
  'sensor.baseline_dynamic': sensor(25, { friendly_name: 'Dynamic baseline', icon: 'mdi:vector-line' }),
  'sensor.textual': {
    state: 'unavailable',
    attributes: {
      friendly_name: 'Textual state',
      icon: 'mdi:message-alert-outline',
    },
  },
};

const gradientStops = [
  { pos: 0, color: '#2563eb' },
  { pos: 45, color: '#06b6d4' },
  { pos: 75, color: '#f59e0b' },
  { pos: 100, color: '#dc2626' },
];

const severity = [
  { from: 0, to: 25, color: '#ef4444' },
  { from: 25, to: 50, color: '#f59e0b' },
  { from: 50, to: 75, color: '#84cc16' },
  { from: 75, to: 100, color: '#14b8a6' },
];

async function render(page, { width = 720, config, states = baseStates }) {
  await page.goto('/tests/visual/fixtures/harness.html');
  await page.evaluate(async ({ width, config, states }) => {
    await window.__sbcpRenderCard({ width, config, states });
  }, { width, config, states });
  return page.locator('#mount');
}

const scenarios = [
  {
    name: 'normal-no-baseline',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Normal no baseline',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: 0,
      max: 120,
      entities: [{ entity: 'sensor.main_positive', name: 'No baseline' }],
    },
  },
  {
    name: 'baseline-below-value',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Baseline below value',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: 0 },
      entities: [{ entity: 'sensor.main_positive', name: 'Above baseline' }],
    },
  },
  {
    name: 'baseline-above-value',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Baseline above value',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: 0 },
      entities: [{ entity: 'sensor.main_negative', name: 'Below baseline' }],
    },
  },
  {
    name: 'off-center-baseline',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Off-center baseline',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -140,
      max: 140,
      baseline: { at: 70 },
      entities: [
        { entity: 'sensor.main_negative', name: 'Below 75% baseline' },
        { entity: 'sensor.main_positive', name: 'Above 75% baseline' },
      ],
    },
  },
  {
    name: 'dynamic-baseline-fallback',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Dynamic baseline fallback',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      entities: [
        {
          entity: 'sensor.main_positive',
          name: 'Fallback baseline',
          baseline: {
            at: {
              entity: 'sensor.missing_baseline',
              value: 15,
            },
          },
        },
        {
          entity: 'sensor.main_positive',
          name: 'Dynamic baseline',
          baseline: 'sensor.baseline_dynamic',
        },
      ],
    },
  },
  {
    name: 'above-baseline-color',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Above baseline color',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: {
        at: 0,
        above: '#34d399',
      },
      entities: [
        { entity: 'sensor.main_negative', name: 'Inherited below' },
        { entity: 'sensor.main_positive', name: 'Override above' },
      ],
    },
  },
  {
    name: 'below-baseline-color',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Below baseline color',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: {
        at: 0,
        below: '#ef4444',
      },
      entities: [
        { entity: 'sensor.main_negative', name: 'Override below' },
        { entity: 'sensor.main_positive', name: 'Inherited above' },
      ],
    },
  },
  {
    name: 'both-baseline-colors',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Both baseline colors',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: {
        at: 0,
        above: { color: '#34d399' },
        below: { color: '#ef4444' },
      },
      entities: [
        { entity: 'sensor.main_negative', name: 'Below override' },
        { entity: 'sensor.main_positive', name: 'Above override' },
      ],
    },
  },
  {
    name: 'severity-left-edge',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Severity left edge',
      color_mode: 'severity',
      severity,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: 120 },
      entities: [{ entity: 'sensor.main_negative', name: 'Touches left edge' }],
    },
  },
  {
    name: 'gradient-right-edge',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Gradient right edge',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: -120 },
      entities: [{ entity: 'sensor.main_positive', name: 'Touches right edge' }],
    },
  },
  {
    name: 'override-left-edge',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Override left edge',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: {
        at: 120,
        below: '#ef4444',
      },
      entities: [{ entity: 'sensor.main_negative', name: 'Override touches left' }],
    },
  },
  {
    name: 'override-right-edge',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Override right edge',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: {
        at: -120,
        above: '#34d399',
      },
      entities: [{ entity: 'sensor.main_positive', name: 'Override touches right' }],
    },
  },
  {
    name: 'baseline-target',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Baseline target',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: 0 },
      target: 60,
      target_color: '#111827',
      show_target_label: true,
      above_target_color: '#dc2626',
      entities: [{ entity: 'sensor.main_positive', name: 'Target above baseline' }],
    },
  },
  {
    name: 'normal-above-target',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Normal above target',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: 0,
      max: 120,
      target: 60,
      target_color: '#111827',
      show_target_label: true,
      above_target_color: '#dc2626',
      entities: [{ entity: 'sensor.main_positive', name: 'No baseline target overlay' }],
    },
  },
  {
    name: 'baseline-peak',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Baseline peak',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: 0 },
      show_peak: true,
      peak_color: '#7c3aed',
      entities: [{ entity: 'sensor.main_positive', name: 'Peak above baseline' }],
    },
  },
  {
    name: 'severity',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Severity',
      color_mode: 'severity',
      severity,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: { at: 0 },
      entities: [
        { entity: 'sensor.main_negative', name: 'Severity below' },
        { entity: 'sensor.main_positive', name: 'Severity above' },
      ],
    },
  },
  {
    name: 'severity-gradient',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Severity gradient',
      color_mode: 'severity_gradient',
      severity,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [
        { entity: 'sensor.main_negative', name: 'Severity gradient below' },
        { entity: 'sensor.main_positive', name: 'Severity gradient above' },
      ],
    },
  },
  {
    name: 'gradient',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Gradient',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [
        { entity: 'sensor.main_negative', name: 'Gradient below' },
        { entity: 'sensor.main_positive', name: 'Gradient above' },
      ],
    },
  },
  {
    name: 'single',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Single',
      color_mode: 'single',
      color: '#2563eb',
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [
        { entity: 'sensor.main_negative', name: 'Single below' },
        { entity: 'sensor.main_positive', name: 'Single above' },
      ],
    },
  },
  {
    name: 'left-labels',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Left labels',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [
        { entity: 'sensor.main_negative', name: 'Left below' },
        { entity: 'sensor.main_positive', name: 'Left above' },
      ],
    },
  },
  {
    name: 'above-labels',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Above labels',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'above',
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [{ entity: 'sensor.main_positive', name: 'Above layout' }],
    },
  },
  {
    name: 'inside-labels',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Inside labels',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'inside',
      height: 52,
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [{ entity: 'sensor.main_positive', name: 'Inside layout' }],
    },
  },
  {
    name: 'compact-narrow',
    width: 320,
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Compact narrow',
      color_mode: 'gradient',
      gradient_stops: gradientStops,
      label_position: 'left',
      label_width: 90,
      animated: false,
      min: -120,
      max: 120,
      baseline: 0,
      entities: [{ entity: 'sensor.main_positive', name: 'Compact left label baseline row' }],
    },
  },
  {
    name: 'very-small-interval',
    config: {
      type: 'custom:sensor-bar-card-plus',
      title: 'Very small interval',
      color_mode: 'severity_gradient',
      severity,
      label_position: 'left',
      label_width: 170,
      animated: false,
      min: -100,
      max: 100,
      baseline: { at: 0 },
      entities: [{ entity: 'sensor.tiny_positive', name: 'Tiny above baseline' }],
    },
    states: {
      ...baseStates,
      'sensor.tiny_positive': sensor(1, { friendly_name: 'Tiny positive' }),
    },
  },
];

for (const scenario of scenarios) {
  test(`visual regression: ${scenario.name}`, async ({ page }) => {
    const mount = await render(page, scenario);
    await expect(mount).toHaveScreenshot(`${scenario.name}.png`);
  });
}

test('visual regression: baseline-severity-mid-transition', async ({ page }) => {
  const config = {
    type: 'custom:sensor-bar-card-plus',
    title: 'Baseline severity transition',
    color_mode: 'severity',
    severity,
    label_position: 'left',
    label_width: 170,
    animated: true,
    min: -120,
    max: 120,
    baseline: { at: 0 },
    entities: [{ entity: 'sensor.transitioning', name: 'Transitioning severity' }],
  };

  const mount = await render(page, {
    config,
    states: {
      'sensor.transitioning': sensor(-95, { friendly_name: 'Transitioning severity', icon: 'mdi:swap-horizontal' }),
    },
  });

  await page.evaluate(async () => {
    const card = document.querySelector('sensor-bar-card-plus');
    card.hass = {
      states: {
        'sensor.transitioning': window.__sbcpCreateState(95, {
          friendly_name: 'Transitioning severity',
          icon: 'mdi:swap-horizontal',
          unit_of_measurement: 'W',
        }),
      },
    };
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  await expect(mount).toHaveScreenshot('baseline-severity-mid-transition.png');
});

test('visual regression: normal-above-target-mid-transition-downward', async ({ page }) => {
  const config = {
    type: 'custom:sensor-bar-card-plus',
    title: 'Normal above target transition',
    color_mode: 'gradient',
    gradient_stops: gradientStops,
    label_position: 'left',
    label_width: 170,
    animated: true,
    min: 0,
    max: 120,
    target: 60,
    target_color: '#111827',
    show_target_label: true,
    above_target_color: '#dc2626',
    entities: [{ entity: 'sensor.transitioning', name: 'Transitioning above target' }],
  };

  const mount = await render(page, {
    config,
    states: {
      'sensor.transitioning': sensor(95, { friendly_name: 'Transitioning above target', icon: 'mdi:swap-horizontal' }),
    },
  });

  await page.evaluate(async () => {
    const card = document.querySelector('sensor-bar-card-plus');
    card.hass = {
      states: {
        'sensor.transitioning': window.__sbcpCreateState(30, {
          friendly_name: 'Transitioning above target',
          icon: 'mdi:swap-horizontal',
          unit_of_measurement: 'W',
        }),
      },
    };
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  await expect(mount).toHaveScreenshot('normal-above-target-mid-transition-downward.png');
});

for (const [name, colorMode] of [
  ['baseline-gradient-mid-transition', 'gradient'],
  ['baseline-severity-gradient-mid-transition', 'severity_gradient'],
]) {
  test(`visual regression: ${name}`, async ({ page }) => {
    const config = {
      type: 'custom:sensor-bar-card-plus',
      title: name,
      color_mode: colorMode,
      gradient_stops: colorMode === 'gradient' ? gradientStops : undefined,
      severity: colorMode === 'severity_gradient' ? severity : undefined,
      label_position: 'left',
      label_width: 170,
      animated: true,
      min: -120,
      max: 120,
      baseline: { at: 0 },
      entities: [{ entity: 'sensor.transitioning', name: 'Transitioning semantic fill' }],
    };

    const mount = await render(page, {
      config,
      states: {
        'sensor.transitioning': sensor(-95, { friendly_name: 'Transitioning semantic fill', icon: 'mdi:swap-horizontal' }),
      },
    });

    await page.evaluate(async () => {
      const card = document.querySelector('sensor-bar-card-plus');
      card.hass = {
        states: {
          'sensor.transitioning': window.__sbcpCreateState(95, {
            friendly_name: 'Transitioning semantic fill',
            icon: 'mdi:swap-horizontal',
            unit_of_measurement: 'W',
          }),
        },
      };
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    await expect(mount).toHaveScreenshot(`${name}.png`);
  });
}
