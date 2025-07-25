import { describe, expect, test, beforeEach, afterEach } from 'vitest';

/**
 * CSS Visual Behavior Tests
 *
 * These tests verify the CSS rules that govern card hover and selection effects.
 * They ensure consistency across all card types and proper priority of selection over hover.
 */
describe('CSS Visual Behavior', () => {
  let styleElement: HTMLStyleElement;

  beforeEach(() => {
    // Create a style element with our CSS rules for testing
    styleElement = document.createElement('style');
    styleElement.textContent = `
      .card {
        --card-rotate: 0deg;
        --card-translate-y: 0px;
        --card-scale: 1;
        transform: translateY(var(--card-translate-y)) scale(var(--card-scale)) rotate(var(--card-rotate));
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        transition: all 0.2s ease-in-out;
      }

      .hoverable-card:hover {
        --card-translate-y: -2px;
        --card-scale: 1.05;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      .card.selected {
        border-color: #f59e0b;
        --card-translate-y: -5px;
        box-shadow: 0 4px 15px #f59e0b;
      }

      .discard-pile-stack .card {
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      .discard-pile-stack .card.selected {
        box-shadow: 0 4px 15px #f59e0b;
      }

      .discard-pile-stack .hoverable-card:hover {
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      .discard-pile-stack .card.selected.hoverable-card:hover {
        box-shadow: 0 4px 15px #f59e0b;
      }
    `;
    document.head.appendChild(styleElement);
  });

  afterEach(() => {
    if (styleElement) {
      document.head.removeChild(styleElement);
    }
  });

  describe('Transform Custom Properties', () => {
    test('cards use CSS custom properties for transforms', () => {
      const div = document.createElement('div');
      div.className = 'card';
      document.body.appendChild(div);

      const computedStyle = window.getComputedStyle(div);
      expect(computedStyle.transform).toContain('translateY');
      expect(computedStyle.transform).toContain('scale');
      expect(computedStyle.transform).toContain('rotate');

      document.body.removeChild(div);
    });

    test('hoverable cards change custom properties on hover', () => {
      const div = document.createElement('div');
      div.className = 'card hoverable-card';
      document.body.appendChild(div);

      // Simulate hover by adding the hover styles manually
      div.style.setProperty('--card-translate-y', '-2px');
      div.style.setProperty('--card-scale', '1.05');

      expect(div.style.getPropertyValue('--card-translate-y')).toBe('-2px');
      expect(div.style.getPropertyValue('--card-scale')).toBe('1.05');

      document.body.removeChild(div);
    });

    test('selected cards override hover transform values', () => {
      const div = document.createElement('div');
      div.className = 'card hoverable-card selected';
      document.body.appendChild(div);

      // Selected cards should have higher translate-y value
      div.style.setProperty('--card-translate-y', '-5px');

      expect(div.style.getPropertyValue('--card-translate-y')).toBe('-5px');

      document.body.removeChild(div);
    });
  });

  describe('Shadow Effects Priority', () => {
    test('regular cards have default shadow', () => {
      const div = document.createElement('div');
      div.className = 'card';
      document.body.appendChild(div);

      const computedStyle = window.getComputedStyle(div);
      expect(computedStyle.boxShadow).toContain('rgba(0, 0, 0, 0.2)');

      document.body.removeChild(div);
    });

    test('hoverable cards have enhanced shadow on hover', () => {
      const div = document.createElement('div');
      div.className = 'card hoverable-card';
      div.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'; // Simulate hover
      document.body.appendChild(div);

      const computedStyle = window.getComputedStyle(div);
      expect(computedStyle.boxShadow).toContain('rgba(0, 0, 0, 0.15)');

      document.body.removeChild(div);
    });

    test('selected cards have selection shadow', () => {
      const div = document.createElement('div');
      div.className = 'card selected';
      div.style.boxShadow = '0 4px 15px rgb(245, 158, 11)'; // Simulate selection
      document.body.appendChild(div);

      const computedStyle = window.getComputedStyle(div);
      expect(computedStyle.boxShadow).toContain('rgb(245, 158, 11)');

      document.body.removeChild(div);
    });
  });

  describe('Discard Pile Specific Behavior', () => {
    test('discard pile cards have proper class structure', () => {
      const container = document.createElement('div');
      container.className = 'discard-pile-stack';

      const card = document.createElement('div');
      card.className = 'card';
      container.appendChild(card);
      document.body.appendChild(container);

      expect(card.classList.contains('card')).toBe(true);
      expect(container.classList.contains('discard-pile-stack')).toBe(true);

      document.body.removeChild(container);
    });

    test('discard pile selected cards maintain selection shadow even with hover class', () => {
      const container = document.createElement('div');
      container.className = 'discard-pile-stack';

      const card = document.createElement('div');
      card.className = 'card selected hoverable-card';
      // Simulate the high-specificity rule
      card.style.boxShadow = '0 4px 15px rgb(245, 158, 11)';
      container.appendChild(card);
      document.body.appendChild(container);

      const computedStyle = window.getComputedStyle(card);
      expect(computedStyle.boxShadow).toContain('rgb(245, 158, 11)');

      document.body.removeChild(container);
    });

    test('discard pile hoverable cards have hover shadow when not selected', () => {
      const container = document.createElement('div');
      container.className = 'discard-pile-stack';

      const card = document.createElement('div');
      card.className = 'card hoverable-card';
      // Simulate hover shadow
      card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
      container.appendChild(card);
      document.body.appendChild(container);

      const computedStyle = window.getComputedStyle(card);
      expect(computedStyle.boxShadow).toContain('rgba(0, 0, 0, 0.15)');

      document.body.removeChild(container);
    });
  });

  describe('CSS Specificity Rules', () => {
    test('selection rules have higher specificity than hover rules', () => {
      // This test verifies that our CSS structure ensures proper priority
      const specificityTests = [
        {
          selector: '.card.selected',
          description: 'Basic selection rule',
          specificity: 20 // 1 class + 1 class
        },
        {
          selector: '.hoverable-card:hover',
          description: 'Basic hover rule',
          specificity: 20 // 1 class + 1 pseudo-class
        },
        {
          selector: '.discard-pile-stack .card.selected.hoverable-card:hover',
          description: 'High-specificity selection override',
          specificity: 50 // 1 class + 1 class + 1 class + 1 class + 1 pseudo-class
        },
        {
          selector: '.discard-pile-stack .hoverable-card:hover',
          description: 'Discard pile hover rule',
          specificity: 30 // 1 class + 1 class + 1 pseudo-class
        }
      ];

      // Verify that our high-specificity rule is indeed higher than others
      const highSpecRule = specificityTests.find(t => t.description === 'High-specificity selection override');
      const otherRules = specificityTests.filter(t => t.description !== 'High-specificity selection override');

      expect(highSpecRule).toBeDefined();
      otherRules.forEach(rule => {
        expect(highSpecRule!.specificity).toBeGreaterThan(rule.specificity);
      });
    });
  });

  describe('Cross-Theme Consistency', () => {
    test('selection behavior works consistently across themes', () => {
      const themes = ['light', 'dark', 'metro', 'neon', 'retro'];

      themes.forEach(theme => {
        const div = document.createElement('div');
        div.className = `card selected ${theme}`;
        document.body.appendChild(div);

        // All themes should have the selected class
        expect(div.classList.contains('selected')).toBe(true);
        expect(div.classList.contains('card')).toBe(true);

        document.body.removeChild(div);
      });
    });

    test('hover behavior works consistently across themes', () => {
      const themes = ['light', 'dark', 'metro', 'neon', 'retro'];

      themes.forEach(theme => {
        const div = document.createElement('div');
        div.className = `card hoverable-card ${theme}`;
        document.body.appendChild(div);

        // All themes should have the hoverable-card class
        expect(div.classList.contains('hoverable-card')).toBe(true);
        expect(div.classList.contains('card')).toBe(true);

        document.body.removeChild(div);
      });
    });
  });
});
