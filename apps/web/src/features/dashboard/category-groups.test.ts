import { describe, expect, it } from 'vitest';
import {
  groupCategories,
  type CategoryItem,
} from './category-groups';

function item(
  categoryId: string,
  name: string,
  totalCents: number,
  count: number,
  percentage: number,
  color: string | null = null,
): CategoryItem {
  return { categoryId, name, color, totalCents, count, percentage };
}

describe('groupCategories', () => {
  it('does not add Other for fewer than or exactly 6 items', () => {
    const five = Array.from({ length: 5 }, (_, index) =>
      item(`category-${index}`, `Category ${index}`, 500 - index * 50, 1, 10),
    );
    const six = Array.from({ length: 6 }, (_, index) =>
      item(`category-${index}`, `Category ${index}`, 600 - index * 50, 1, 10),
    );

    expect(groupCategories(five, 2000)).toHaveLength(5);
    expect(groupCategories(six, 3000)).toHaveLength(6);
    expect(groupCategories(six, 3000).some((slice) => slice.name.startsWith('Other'))).toBe(false);
  });

  it('groups the 3 smallest items into Other for 8 items', () => {
    const items = [
      item('b', 'B', 2000, 2, 20),
      item('h', 'H', 100, 1, 1),
      item('d', 'D', 800, 2, 8),
      item('a', 'A', 3000, 3, 30),
      item('g', 'G', 200, 1, 2),
      item('e', 'E', 600, 2, 6),
      item('c', 'C', 1000, 1, 10),
      item('f', 'F', 300, 2, 3),
    ];

    const slices = groupCategories(items, 10000);
    expect(slices).toHaveLength(6);
    expect(slices.slice(0, 5).map((slice) => slice.name)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);

    expect(slices[5]).toMatchObject({
      key: 'other',
      name: 'Other (3)',
      totalCents: 600,
      count: 4,
      percentage: 6,
      color: 'var(--muted-foreground)',
    });
  });

  it('does not mutate the input and sorts slices by total descending', () => {
    const items = [
      item('small', 'Small', 100, 1, 10),
      item('large', 'Large', 900, 3, 90),
      item('middle', 'Middle', 500, 2, 50),
    ];
    const original = [...items];

    const slices = groupCategories(items, 1500);

    expect(items).toEqual(original);
    expect(slices.map((slice) => slice.name)).toEqual([
      'Large',
      'Middle',
      'Small',
    ]);
  });

  it('uses category colors and palette colors for null colors by index', () => {
    const items = [
      item('red', 'Red', 500, 1, 50, '#ff0000'),
      item('blue', 'Blue', 400, 1, 40, null),
      item('green', 'Green', 300, 1, 30, '#00ff00'),
    ];

    const slices = groupCategories(items, 1200);

    expect(slices[0]?.color).toBe('#ff0000');
    expect(slices[1]?.color).toBe('var(--chart-2)');
    expect(slices[2]?.color).toBe('#00ff00');
  });

  it('uses zero Other percentage when totalCents is zero', () => {
    const items = [
      item('a', 'A', 100, 1, 100),
      item('b', 'B', 90, 1, 90),
      item('c', 'C', 80, 1, 80),
      item('d', 'D', 70, 1, 70),
      item('e', 'E', 60, 1, 60),
      item('f', 'F', 50, 1, 50),
      item('g', 'G', 40, 1, 40),
    ];

    expect(() => groupCategories(items, 0)).not.toThrow();
    expect(groupCategories(items, 0).at(-1)?.percentage).toBe(0);
  });

  it('returns an empty array for an empty list', () => {
    expect(groupCategories([], 1000)).toEqual([]);
  });

  it('supports a custom maxSlices value', () => {
    const items = [
      item('a', 'A', 700, 1, 70),
      item('b', 'B', 600, 1, 60),
      item('c', 'C', 500, 1, 50),
      item('d', 'D', 400, 1, 40),
      item('e', 'E', 300, 1, 30),
    ];

    const slices = groupCategories(items, 2500, 3);

    expect(slices).toHaveLength(3);
    expect(slices.slice(0, 2).map((slice) => slice.name)).toEqual(['A', 'B']);
    expect(slices[2]).toMatchObject({
      name: 'Other (3)',
      totalCents: 1200,
      count: 3,
      percentage: 48,
    });
  });
});
