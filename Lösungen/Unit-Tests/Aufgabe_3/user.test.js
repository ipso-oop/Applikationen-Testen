const { getUser } = require('./user');


test('User-Daten = Snapshot', () => {
  expect(getUser()).toMatchSnapshot();
});
