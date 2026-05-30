import request from 'supertest';

const { createApp } = require('../../src/app');

describe('App health route', () => {
    const app = createApp();

    it('should return health status', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });

    it('should expose the OpenAPI document', async () => {
        const response = await request(app).get('/api/docs.json');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.3');
        expect(response.body.paths['/health']).toBeDefined();
        expect(response.body.paths['/api/departments']).toBeDefined();
        expect(response.body.paths['/api/services']).toBeDefined();
        expect(response.body.paths['/api/staff/{id}/schedules']).toBeDefined();
        expect(response.body.paths['/api/lab-orders/{id}/trigger-ai']).toBeDefined();
        expect(response.body.paths['/api/import/{entity}']).toBeDefined();
        expect(response.body.paths['/internal/appointments/reminders']).toBeDefined();
        expect(
            response.body.paths['/internal/patients/link-by-personal-number'],
        ).toBeDefined();
        expect(response.body.components.securitySchemes.bearerAuth).toBeDefined();
        expect(response.body.components.securitySchemes.internalApiKey).toBeDefined();
    });
});
