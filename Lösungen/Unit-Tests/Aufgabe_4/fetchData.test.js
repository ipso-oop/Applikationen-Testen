const { fetchData } = require('./fetchData');

test('Mocking mit jest.fn()', () => {
  const mockApi = jest.fn(() => 'Resultat MockFunktion');
  const result = fetchData(mockApi);

  expect(mockApi).toHaveBeenCalled();
  expect(result).toBe('Resultat MockFunktion');
});