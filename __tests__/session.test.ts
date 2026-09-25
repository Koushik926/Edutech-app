jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

process.env.EXPO_PUBLIC_BASE_URL = 'https://api.test';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { revalidateSession, loginUser } = require('../utils/api') as typeof import('../utils/api');

const user = { _id: 'u1', username: 'amy', email: 'amy@test.com' };

function reply(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

const urls = () => fetchMock.mock.calls.map(([url]) => url as string);

describe('revalidateSession', () => {
  it('accepts a valid access token and hits the versioned endpoint', async () => {
    fetchMock.mockImplementation(() => reply(200, { data: user }));
    const result = await revalidateSession('access', 'refresh');
    expect(result).toEqual({ status: 'valid', user, accessToken: 'access', refreshToken: 'refresh' });
    expect(urls()).toEqual(['https://api.test/api/v1/users/current-user']);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer access');
  });

  it('refreshes an expired access token (token in body) and keeps the rotated refresh token', async () => {
    fetchMock
      .mockImplementationOnce(() => reply(401, { message: 'jwt expired' }))
      .mockImplementationOnce(() => reply(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }))
      .mockImplementationOnce(() => reply(200, { data: user }));

    const result = await revalidateSession('old', 'refresh');
    expect(result).toEqual({ status: 'valid', user, accessToken: 'new-access', refreshToken: 'new-refresh' });
    expect(urls()[1]).toBe('https://api.test/api/v1/users/refresh-token');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ refreshToken: 'refresh' });
  });

  it('reports expired when the server rejects both tokens', async () => {
    fetchMock.mockImplementation(() => reply(401, { message: 'Unauthorized' }));
    await expect(revalidateSession('a', 'r')).resolves.toEqual({ status: 'expired' });
  });

  it('keeps the session when the network is down (does not log the user out)', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Network request failed')));
    const pending = revalidateSession('a', 'r');
    await jest.runAllTimersAsync(); // skip GET retry back-off
    await expect(pending).resolves.toEqual({ status: 'unreachable' });
    jest.useRealTimers();
  });
});

describe('request retries', () => {
  it('does not retry a rejected login (4xx POST)', async () => {
    fetchMock.mockImplementation(() => reply(401, { message: 'Invalid user credentials' }));
    await expect(loginUser({ email: 'a@b.c', password: 'nope12' })).rejects.toThrow('Invalid user credentials');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
