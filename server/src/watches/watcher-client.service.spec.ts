import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { WatcherClientService } from './watcher-client.service';

const KEY = 'k'.repeat(32);

function client(env: Record<string, string | undefined>) {
  return new WatcherClientService({ get: (k: string) => env[k] } as unknown as ConfigService);
}

describe('WatcherClientService (F34)', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('PUTs every watch with the api key and contract body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const res = await client({ WATCHER_URL: 'http://w/api/', WATCHER_API_KEY: KEY }).syncAll([
      { id: 12, name: 'iPhone 17', aliases: ['17pm'], maxPrice: new Prisma.Decimal('1300'), currency: 'USD', isActive: true },
      { id: 13, name: 'S25', aliases: [], maxPrice: null, currency: 'UZS', isActive: false },
    ]);
    expect(res).toEqual({ ok: true, status: 200 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://w/api/watches/sync');
    expect(init).toMatchObject({ method: 'PUT', redirect: 'error', headers: { 'x-api-key': KEY } });
    expect(JSON.parse(init.body as string)).toEqual({
      watches: [
        { externalId: '12', name: 'iPhone 17', aliases: ['17pm'], maxPrice: '1300.00', currency: 'USD', isActive: true },
        { externalId: '13', name: 'S25', aliases: [], currency: 'UZS', isActive: false },
      ],
    });
  });

  it('reports a non-2xx status and a network error as not ok', async () => {
    const c = client({ WATCHER_URL: 'http://w', WATCHER_API_KEY: KEY });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(c.syncAll([])).resolves.toEqual({ ok: false, status: 503 });
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(c.syncAll([])).resolves.toEqual({ ok: false });
  });

  it('pings GET /status with the api key', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await expect(client({ WATCHER_URL: 'http://w/api', WATCHER_API_KEY: KEY }).ping()).resolves.toEqual({ ok: true, status: 200 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://w/api/status');
    expect(init).toMatchObject({ method: 'GET', redirect: 'error', headers: { 'x-api-key': KEY } });
    expect(init.body).toBeUndefined();
  });

  it('is configured only when both URL and key are set', () => {
    expect(client({ WATCHER_URL: 'http://w', WATCHER_API_KEY: KEY }).isConfigured()).toBe(true);
    expect(client({ WATCHER_URL: 'http://w' }).isConfigured()).toBe(false);
  });
});
