
function isValidEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') return false;

  const regex = /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

module.exports = { isValidEmail };
