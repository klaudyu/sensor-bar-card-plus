import { describe, it, expect } from 'vitest';
import { createCard } from '../support/load-card-class.cjs';

describe('Sensor Bar Card Plus logic', () => {
  it('normalizes card defaults and single-entity shorthand', () => {
    const card = createCard();
    const cfg = card.normalizeCardConfig({
      entity: 'sensor.one',
      baseline: 0,
    });

    expect(cfg.entities).toHaveLength(1);
    expect(cfg.entities[0].entity).toBe('sensor.one');
    expect(cfg.baseline.at.value).toBe(0);
    expect(cfg.bar.color_mode).toBe('severity');
    expect(cfg.layout.label_position).toBe('left');
  });

  it('merges per-entity scale overrides over card defaults', () => {
    const card = createCard();
    const cfg = card.normalizeCardConfig({
      min: 0,
      max: 100,
      baseline: 10,
      entities: [
        { entity: 'sensor.row', max: 500, baseline: { at: 75 } },
      ],
    });

    expect(cfg.entities[0].scale.min.value).toBe(0);
    expect(cfg.entities[0].scale.max.value).toBe(500);
    expect(cfg.entities[0].baseline.at.value).toBe(75);
  });

  it('preserves min_entity and max_entity fallback behavior', () => {
    const card = createCard();
    card._hass.states = {
      'sensor.dynamic_min': { state: '12' },
      'sensor.dynamic_max': { state: '240' },
    };

    const cfg = card.normalizeCardConfig({
      min: 0,
      min_entity: 'sensor.dynamic_min',
      max: 100,
      max_entity: 'sensor.dynamic_max',
      entities: [{ entity: 'sensor.row' }],
    });
    const row = cfg.entities[0];

    expect(card._getNormalizedResolvableNumericValue(row.scale.min)).toBe(12);
    expect(card._getNormalizedResolvableNumericValue(row.scale.max)).toBe(240);

    delete card._hass.states['sensor.dynamic_min'];
    delete card._hass.states['sensor.dynamic_max'];

    expect(card._getNormalizedResolvableNumericValue(row.scale.min)).toBe(0);
    expect(card._getNormalizedResolvableNumericValue(row.scale.max)).toBe(100);
  });

  it('preserves target and target_entity fallback behavior', () => {
    const card = createCard();
    card._hass.states = {
      'sensor.dynamic_target': { state: '77' },
    };

    const cfg = card.normalizeCardConfig({
      target: 50,
      target_entity: 'sensor.dynamic_target',
      entities: [{ entity: 'sensor.row' }],
    });
    const row = cfg.entities[0];

    expect(card._getNormalizedResolvableNumericValue(row.target_marker.source)).toBe(77);

    delete card._hass.states['sensor.dynamic_target'];
    expect(card._getNormalizedResolvableNumericValue(row.target_marker.source)).toBe(50);
  });

  it('supports baseline number shorthand', () => {
    const card = createCard();
    const cfg = card.normalizeCardConfig({
      baseline: 5,
      entities: [{ entity: 'sensor.row' }],
    });

    expect(cfg.baseline.at).toMatchObject({ value: 5, entity: null });
  });

  it('supports baseline entity-string shorthand', () => {
    const card = createCard();
    const cfg = card.normalizeCardConfig({
      baseline: 'sensor.dynamic_baseline',
      entities: [{ entity: 'sensor.row' }],
    });

    expect(cfg.baseline.at).toMatchObject({ value: null, entity: 'sensor.dynamic_baseline' });
  });

  it('supports baseline.at shorthand and baseline.at entity shorthand', () => {
    const card = createCard();
    const numericCfg = card.normalizeCardConfig({
      baseline: { at: 0 },
      entities: [{ entity: 'sensor.row' }],
    });
    const entityCfg = card.normalizeCardConfig({
      baseline: { at: 'sensor.dynamic_baseline' },
      entities: [{ entity: 'sensor.row' }],
    });

    expect(numericCfg.baseline.at).toMatchObject({ value: 0, entity: null });
    expect(entityCfg.baseline.at).toMatchObject({ value: null, entity: 'sensor.dynamic_baseline' });
  });

  it('preserves baseline.at.entity plus baseline.at.value fallback behavior', () => {
    const card = createCard();
    card._hass.states = {
      'sensor.dynamic_baseline': { state: '15' },
    };

    const cfg = card.normalizeCardConfig({
      baseline: {
        at: {
          entity: 'sensor.dynamic_baseline',
          value: 5,
        },
      },
      entities: [{ entity: 'sensor.row' }],
    });
    const row = cfg.entities[0];

    expect(card._getNormalizedResolvableNumericValue(row.baseline.at)).toBe(15);

    delete card._hass.states['sensor.dynamic_baseline'];
    expect(card._getNormalizedResolvableNumericValue(row.baseline.at)).toBe(5);
  });

  it('triggers an update when a watched baseline entity appears after first render', () => {
    const card = createCard();
    card._config = card.normalizeCardConfig({
      baseline: 'sensor.dynamic_baseline',
      entities: [{ entity: 'sensor.row' }],
    });

    const oldHass = {
      states: {
        'sensor.row': { state: '10', attributes: {} },
      },
    };
    const newHass = {
      states: {
        'sensor.row': { state: '10', attributes: {} },
        'sensor.dynamic_baseline': { state: '15', attributes: {} },
      },
    };

    expect(card._shouldUpdate(oldHass, newHass)).toBe(true);
  });

  it('supports baseline direction color shorthand and expanded color objects', () => {
    const card = createCard();
    const shorthandCfg = card.normalizeCardConfig({
      baseline: {
        at: 0,
        above: '#34d399',
        below: '#ef4444',
      },
      entities: [{ entity: 'sensor.row' }],
    });
    const expandedCfg = card.normalizeCardConfig({
      baseline: {
        at: 0,
        above: { color: '#34d399' },
        below: { color: '#ef4444' },
      },
      entities: [{ entity: 'sensor.row' }],
    });

    expect(shorthandCfg.baseline.above.color).toBe('#34d399');
    expect(shorthandCfg.baseline.below.color).toBe('#ef4444');
    expect(expandedCfg.baseline.above.color).toBe('#34d399');
    expect(expandedCfg.baseline.below.color).toBe('#ef4444');
  });

  it('converts scale values to percent and clamps out-of-range values', () => {
    const card = createCard();

    expect(card._toScalePct(-10, 0, 100)).toBe(0);
    expect(card._toScalePct(50, 0, 100)).toBe(50);
    expect(card._toScalePct(120, 0, 100)).toBe(100);
  });

  it('handles min == max safely when converting to percent', () => {
    const card = createCard();

    expect(card._toScalePct(25, 25, 25)).toBe(0);
    expect(card._toScalePct(30, 25, 25)).toBe(100);
  });

  it('calculates baseline intervals at min, center, max, 10%, and 75%', () => {
    const card = createCard();

    expect(card._getNormalizedPercent(70, 0)).toMatchObject({ start: 0, end: 70, positive: true });
    expect(card._getNormalizedPercent(95, 10)).toMatchObject({ start: 10, end: 95, positive: true });
    expect(card._getNormalizedPercent(80, 50)).toMatchObject({ start: 50, end: 80, positive: true });
    expect(card._getNormalizedPercent(35, 75)).toMatchObject({ start: 35, end: 75, positive: false });
    expect(card._getNormalizedPercent(20, 100)).toMatchObject({ start: 20, end: 100, positive: false });
  });

  it('handles value above, below, and equal to baseline', () => {
    const card = createCard();

    expect(card._getNormalizedPercent(80, 50)).toMatchObject({ start: 50, end: 80, positive: true, hidden: false });
    expect(card._getNormalizedPercent(20, 50)).toMatchObject({ start: 20, end: 50, positive: false, hidden: false });
    expect(card._getNormalizedPercent(50, 50)).toMatchObject({ start: 50, end: 50, hidden: true });
  });

  it('distinguishes value endpoints from baseline endpoints', () => {
    const card = createCard();

    expect(card._getEndpointSemantics(card._getNormalizedPercent(80, null))).toMatchObject({
      left: 'scale',
      right: 'value',
    });
    expect(card._getEndpointSemantics(card._getNormalizedPercent(80, 50))).toMatchObject({
      left: 'baseline',
      right: 'value',
    });
    expect(card._getEndpointSemantics(card._getNormalizedPercent(20, 50))).toMatchObject({
      left: 'value',
      right: 'baseline',
    });
  });

  it('builds a single reveal shape with semantic endpoint radii', () => {
    const card = createCard();
    const normalReveal = card._getRevealShapeStyle(card._getNormalizedPercent(75, null), 38);
    const baselinePositiveReveal = card._getRevealShapeStyle(card._getNormalizedPercent(75, 25), 38);
    const baselineNegativeReveal = card._getRevealShapeStyle(card._getNormalizedPercent(25, 75), 38);

    expect(normalReveal).toContain('clip-path:inset(0 25% 0 0% round 6px 6px 6px 6px)');
    expect(baselinePositiveReveal).toContain('clip-path:inset(0 25% 0 25% round 0 6px 6px 0)');
    expect(baselineNegativeReveal).toContain('clip-path:inset(0 25% 0 25% round 6px 0 0 6px)');
  });

  it('integrates above-target color into the full-width paint layer regardless of current value', () => {
    const card = createCard();
    const ecfg = card.normalizeCardConfig({
      color_mode: 'gradient',
      gradient_stops: [
        { pos: 0, color: '#2563eb' },
        { pos: 100, color: '#dc2626' },
      ],
      above_target_color: '#ef4444',
      min: -100,
      max: 100,
      baseline: { at: 0 },
      target: 60,
      entities: [{ entity: 'sensor.row' }],
    }).entities[0];

    const targetPct = card._toScalePct(60, -100, 100);
    const baselinePct = card._toScalePct(0, -100, 100);
    const paintStyleAbove = card._getFullScalePaintStyle(ecfg, '#dc2626', targetPct, baselinePct);
    const paintStyleBelow = card._getFullScalePaintStyle(ecfg, '#2563eb', targetPct, baselinePct);

    expect(paintStyleAbove).toContain('#ef4444');
    expect(paintStyleAbove).toContain(`transparent ${targetPct}%`);
    expect(paintStyleBelow).toContain('#ef4444');
    expect(paintStyleBelow).toContain(`transparent ${targetPct}%`);
  });

  it('keeps very small reveal intervals as tiny clipped windows on full-width paint', () => {
    const card = createCard();
    const reveal = card._getRevealShapeStyle({ start: 49, end: 50, hidden: false, usesBaseline: true, positive: true }, 38);

    expect(reveal).toContain('clip-path:inset(0 50% 0 49%');
  });

  it('formats numeric displays with decimal precision', () => {
    const card = createCard();

    expect(card._formatNumericDisplay(12.345, 0)).toBe('12');
    expect(card._formatNumericDisplay(12.345, 1)).toMatch(/^12[.,]3$/);
    expect(card._formatNumericDisplay(12.345, 2)).toMatch(/^12[.,]35$/);
    expect(card._formatDisplayWithUnit('12.3', 'W')).toBe('12.3 W');
    expect(card._formatDisplayWithUnit('43', 's')).toBe('43s');
  });

  it('does not crash on non-numeric state formatting', () => {
    const card = createCard();

    expect(card._formatNumericDisplay(Number.NaN, 1)).toBe('NaN');
    expect(card._getNumericValue('unknown')).toBeNull();
    expect(card._getNumericValue('', null)).toBeNull();
  });

  it('computes target percentages in the same global coordinate space', () => {
    const card = createCard();

    expect(card._toScalePct(0, -2000, 5000)).toBeCloseTo(28.5714, 3);
    expect(card._toScalePct(3500, -2000, 5000)).toBeCloseTo(78.5714, 3);
  });
});
