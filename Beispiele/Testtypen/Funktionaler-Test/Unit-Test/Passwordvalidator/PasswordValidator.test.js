const isValidPassword = require('./passwordValidator');

describe('isValidPassword', () => {
  test('gültiges Passwort', () => {
    expect(isValidPassword('Passwort1')).toBe(true);
  });

  test('kein Großbuchstabe', () => {
    expect(isValidPassword('passwort1')).toBe(false);
  });

  test('keine Zahl', () => {
    expect(isValidPassword('PASSWORT')).toBe(false);
  });

  test('enthält Leerzeichen', () => {
    expect(isValidPassword('Pwd 1234')).toBe(false);
  });

  test('zu kurz', () => {
    expect(isValidPassword('P1')).toBe(false);
  });

  test('alle Kriterien erfüllt', () => {
    expect(isValidPassword('Password123')).toBe(true);
  });
});

