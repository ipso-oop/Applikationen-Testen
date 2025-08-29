const { delayedLog } = require('./timer');

jest.useFakeTimers();

test('Timer Callback', () => {
  const mockCallback = jest.fn();

  delayedLog(mockCallback);
  jest.runAllTimers();

  expect(mockCallback).toHaveBeenCalledWith('Timer Callback wurde nach 3000s aufgerufen');
});