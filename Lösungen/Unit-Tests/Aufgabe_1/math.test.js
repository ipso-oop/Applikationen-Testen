const { add, multiply } = require('./math');

test('Addition', () => {
  expect(add(2, 3)).toBe(5);
});

test('Multiplikation', () => {
  expect(multiply(4, 5)).toBe(20);
});

test('String und Zahl', () => {
  expect(add("2", 3)).toBe("23");
});
