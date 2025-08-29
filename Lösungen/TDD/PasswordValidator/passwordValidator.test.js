const { validatePassword } = require('./passwordValidator');


describe('Password Validierung', () => {
	test('Strong Password', () => {
    expect(validatePassword('Abcd1234!')).toBe(true);
  });

  test('Leerer String geht nicht', () => {
    expect(validatePassword('')).toBe(false);
  });


  test('Ohne Grossbuchstaben', () => {
    expect(validatePassword('adfasdfasdfyvz123!')).toBe(false);
  });


  test('Ohne Kleinbuchstaben', () => {
    expect(validatePassword('ABCDE123!')).toBe(false);
  });

  test('Ohne Zahlen', () => {
    expect(validatePassword('Abcdefgh!')).toBe(false);
  });

  test('Ohne Sonderzeichen', () => {
    expect(validatePassword('Abcdefg1')).toBe(false);
  });

  
});
