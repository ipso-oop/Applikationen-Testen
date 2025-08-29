const { isValidEmail } = require('./emailValidator');

test('valid email: user@example.com', () => {
  expect(isValidEmail('user@example.com')).toBe(true);
});


test('invalid email: missing @ symbol', () => {
  expect(isValidEmail('userexample.com')).toBe(false);
});

