import { sanitizeAuditData } from './audit-log.interceptor';

describe('sanitizeAuditData', () => {
  it('che đệ quy password, token, secret và authorization', () => {
    expect(
      sanitizeAuditData({
        password: 'one',
        nested: {
          refreshToken: 'two',
          authorization: 'Bearer three',
          safe: 'visible',
        },
        items: [{ apiSecret: 'four', name: 'item' }],
      }),
    ).toEqual({
      password: '***',
      nested: {
        refreshToken: '***',
        authorization: '***',
        safe: 'visible',
      },
      items: [{ apiSecret: '***', name: 'item' }],
    });
  });
});
