function isValidPassword(pwd) {
  return (
    typeof pwd === "string" &&
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /\d/.test(pwd) &&
    !/\s/.test(pwd)
  );
}

module.exports = isValidPassword;
