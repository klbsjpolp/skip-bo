import { render, fireEvent } from '@testing-library/react';
import { Card } from '../Card';
import { describe, expect, test, vi } from 'vitest';

describe('Card Interaction Behavior', () => {
  describe('Cursor Behavior', () => {
    test('grabbable cards show pointer cursor', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={true}
          onClick={vi.fn()}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).toContain('cursor-pointer');
      expect(card.className).not.toContain('cursor-default');
    });

    test('non-grabbable cards with onClick show default cursor', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={false}
          onClick={vi.fn()}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).toContain('cursor-default');
      expect(card.className).not.toContain('cursor-pointer');
    });

    test('cards without onClick show default cursor', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={false}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).toContain('cursor-default');
      expect(card.className).not.toContain('cursor-pointer');
    });
  });

  describe('Hover Effects', () => {
    test('grabbable cards have hoverable-card class', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={true}
          onClick={vi.fn()}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).toContain('hoverable-card');
    });

    test('non-grabbable cards do not have hoverable-card class', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={false}
          onClick={vi.fn()}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).not.toContain('hoverable-card');
    });
  });

  describe('Selection Effects', () => {
    test('selected cards have selected class', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          isSelected={true}
          canBeGrabbed={true}
          onClick={vi.fn()}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).toContain('selected');
    });

    test('non-selected cards do not have selected class', () => {
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          isSelected={false}
          canBeGrabbed={true}
          onClick={vi.fn()}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      expect(card.className).not.toContain('selected');
    });
  });

  describe('Transform Effects', () => {
    test('cards use CSS custom properties for transforms', () => {
      const {container} = render(
        <Card
          card={{value: 5, isSkipBo: false}}
          canBeGrabbed={true}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;

      // Check that CSS custom properties are present in the DOM element's style
      expect(card.style.getPropertyValue('--card-rotate')).toBeDefined();
      expect(card.style.getPropertyValue('--card-translate-y')).toBeDefined();
      expect(card.style.getPropertyValue('--card-scale')).toBeDefined();
    });
  });

  describe('Click Behavior', () => {
    test('clicking grabbable card calls onClick', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={true}
          onClick={mockOnClick}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('clicking non-grabbable card still calls onClick if provided', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <Card
          card={{ value: 5, isSkipBo: false }}
          canBeGrabbed={false}
          onClick={mockOnClick}
        />
      );

      const card = container.querySelector('.card') as HTMLElement;
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Consistent Behavior Across Card Types', () => {
    test('all grabbable cards have same hover and cursor classes', () => {
      const configs = [
        { card: { value: 5, isSkipBo: false }, canBeGrabbed: true, onClick: vi.fn() },
        { card: { value: 10, isSkipBo: false }, canBeGrabbed: true, onClick: vi.fn() },
        { card: { value: 1, isSkipBo: true }, canBeGrabbed: true, onClick: vi.fn() },
      ];

      configs.forEach(config => {
        const { container } = render(<Card {...config} />);
        const card = container.querySelector('.card') as HTMLElement;

        expect(card.className).toContain('hoverable-card');
        expect(card.className).toContain('cursor-pointer');
        expect(card.className).not.toContain('cursor-default');
      });
    });

    test('all non-grabbable cards have same cursor class', () => {
      const configs = [
        { card: { value: 5, isSkipBo: false }, canBeGrabbed: false },
        { card: { value: 10, isSkipBo: false }, canBeGrabbed: false, onClick: vi.fn() },
        { card: { value: 1, isSkipBo: true }, canBeGrabbed: false },
      ];

      configs.forEach(config => {
        const { container } = render(<Card {...config} />);
        const card = container.querySelector('.card') as HTMLElement;

        expect(card.className).not.toContain('hoverable-card');
        expect(card.className).toContain('cursor-default');
        expect(card.className).not.toContain('cursor-pointer');
      });
    });

    test('all selected cards have same selected class regardless of other properties', () => {
      const configs = [
        { card: { value: 5, isSkipBo: false }, isSelected: true, canBeGrabbed: true },
        { card: { value: 10, isSkipBo: false }, isSelected: true, canBeGrabbed: false },
        { card: { value: 1, isSkipBo: true }, isSelected: true, canBeGrabbed: true },
      ];

      configs.forEach(config => {
        const { container } = render(<Card {...config} />);
        const card = container.querySelector('.card') as HTMLElement;

        expect(card.className).toContain('selected');
      });
    });
  });
});
