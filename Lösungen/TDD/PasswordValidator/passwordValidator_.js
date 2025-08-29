/*function validatePassword(password) {
  
  if (typeof password !== 'string' || password.trim() === '') return false;
  
  if (password.length < 8) return false;
  
  return true;
}

module.exports = { validatePassword };
*/

function validatePassword(password) {
  if (typeof password !== 'string' || password.trim() === '') return false;

  if (password.length < 8) return false;

  const hasGrossbuchstaben = /[A-Z]/.test(password);
  const hasKleinbuchstaben = /[a-z]/.test(password);
  const hasZahlen = /[0-9]/.test(password);
  const hasSonderzeichen = /[!@#$%^&*()\-_=+]/.test(password);

  return hasGrossbuchstaben && hasKleinbuchstaben && hasZahlen && hasSonderzeichen;
}

module.exports = { validatePassword };

