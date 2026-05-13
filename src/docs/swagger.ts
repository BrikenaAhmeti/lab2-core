import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'MedSphere Core Backend API',
            version: '1.0.0',
            description:
                'OpenAPI documentation for the current MedSphere core backend service.',
        },
        servers: [
            {
                url: 'http://localhost:3007',
                description: 'Local development',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'ok',
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Validation failed',
                        },
                    },
                },
                Department: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Cardiology' },
                        description: { type: 'string', nullable: true, example: 'Heart care' },
                        floor: { type: 'string', nullable: true, example: '2' },
                        phoneExtension: { type: 'string', nullable: true, example: '204' },
                        operatingHours: {
                            type: 'object',
                            nullable: true,
                            additionalProperties: true,
                            example: {
                                monday: { start: '08:00', end: '16:00' },
                            },
                        },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'integer', example: 0 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                DepartmentListResponse: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Department' },
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                limit: { type: 'integer', example: 10 },
                                total: { type: 'integer', example: 1 },
                                totalPages: { type: 'integer', example: 1 },
                            },
                        },
                    },
                },
                CreateDepartmentRequest: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', example: 'Cardiology' },
                        description: { type: 'string', example: 'Heart care' },
                        floor: { type: 'string', example: '2' },
                        phoneExtension: { type: 'string', example: '204' },
                        operatingHours: {
                            type: 'object',
                            additionalProperties: true,
                        },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'integer', example: 0 },
                    },
                },
                UpdateDepartmentRequest: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', example: 'Radiology' },
                        description: { type: 'string', nullable: true, example: 'Imaging unit' },
                        floor: { type: 'string', nullable: true, example: '1' },
                        phoneExtension: { type: 'string', nullable: true, example: '101' },
                        operatingHours: {
                            type: 'object',
                            nullable: true,
                            additionalProperties: true,
                        },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'integer', example: 1 },
                    },
                },
                ServiceCatalog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        departmentId: { type: 'string', format: 'uuid' },
                        department: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string', example: 'Cardiology' },
                                isActive: { type: 'boolean', example: true },
                            },
                        },
                        name: { type: 'string', example: 'Initial Consultation' },
                        description: {
                            type: 'string',
                            nullable: true,
                            example: 'Standard first visit',
                        },
                        defaultDurationMinutes: { type: 'integer', example: 30 },
                        defaultPrice: { type: 'number', example: 50 },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'integer', example: 0 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ServiceCatalogListResponse: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ServiceCatalog' },
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                limit: { type: 'integer', example: 10 },
                                total: { type: 'integer', example: 1 },
                                totalPages: { type: 'integer', example: 1 },
                            },
                        },
                    },
                },
                CreateServiceCatalogRequest: {
                    type: 'object',
                    required: [
                        'departmentId',
                        'name',
                        'defaultDurationMinutes',
                        'defaultPrice',
                    ],
                    properties: {
                        departmentId: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Initial Consultation' },
                        description: { type: 'string', example: 'Standard first visit' },
                        defaultDurationMinutes: { type: 'integer', example: 30 },
                        defaultPrice: { type: 'number', example: 50 },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'integer', example: 0 },
                    },
                },
                UpdateServiceCatalogRequest: {
                    type: 'object',
                    properties: {
                        departmentId: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Follow-up Visit' },
                        description: {
                            type: 'string',
                            nullable: true,
                            example: 'Shorter follow-up appointment',
                        },
                        defaultDurationMinutes: { type: 'integer', example: 20 },
                        defaultPrice: { type: 'number', example: 35 },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'integer', example: 1 },
                    },
                },
            },
        },
    },
    apis: [
        path.resolve(__dirname, '../app.ts'),
        path.resolve(__dirname, '../modules/**/*.routes.ts'),
    ],
};

export const swaggerSpec = swaggerJSDoc(options);
