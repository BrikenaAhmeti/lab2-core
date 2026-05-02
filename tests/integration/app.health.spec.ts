import request from 'supertest';

const { createApp } = require('../../src/app');

describe('App health route', () => {
    const app = createApp();

    it('should return health status', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });
});
