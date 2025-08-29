let database = [];

beforeEach(() => {
  database = ["user1", "user2"];
});

afterEach(() => {
  database = [];
});



describe('Test mit setup/teardown', () => {
  test('Datenbank hat zwei User', () => {
    expect(database.length).toBe(2);
  });

  test('Add neuen User', () => {
    database.push('user3');
    expect(database).toContain('user3');
  });
});
