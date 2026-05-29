import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';
import { auditLogger } from './shared/middleware/audit-logger';
import { requestContext } from './shared/middleware/request-context';
import { requestLogger } from './shared/middleware/request-logger';
import { departmentRoutes } from './modules/departments/presentation/department.routes';
import { serviceCatalogRoutes } from './modules/service-catalog/presentation/service-catalog.routes';
import { staffPositionTypeRoutes } from './modules/staff-position-types/presentation/staff-position-type.routes';
import { staffRoutes } from './modules/staff/presentation/staff.routes';
import { patientRoutes } from './modules/patients/presentation/patient.routes';
import { settingRoutes } from './modules/settings/presentation/setting.routes';
import { auditLogRoutes } from './modules/audit-logs/presentation/audit-log.routes';
import {
    appointmentRoutes,
    internalAppointmentRoutes,
} from './modules/appointments/presentation/appointment.routes';
import { medicalRecordRoutes } from './modules/medical-records/presentation/medical-record.routes';
import { prescriptionRoutes } from './modules/prescriptions/presentation/prescription.routes';
import {
    labOrderRoutes,
    labTestRoutes,
} from './modules/lab/presentation/lab.routes';
import { billingRoutes } from './modules/billing/presentation/billing.routes';
import { feedbackRoutes } from './modules/feedback/presentation/feedback.routes';
import { contactRoutes } from './modules/contact/presentation/contact.routes';
import { dashboardRoutes } from './modules/dashboard/presentation/dashboard.routes';
import { reportsRoutes } from './modules/reports/presentation/reports.routes';
import { searchRoutes } from './modules/search/presentation/search.routes';
import { swaggerSpec } from './docs/swagger';

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
export function createApp() {
    const app = express();
    const allowedOrigins = env.frontendOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.use(helmet());
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);

                if (allowedOrigins.length === 0 && env.nodeEnv !== 'production') {
                    return callback(null, true);
                }

                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error('CORS policy: origin not allowed'));
            },
        }),
    );
    app.use(requestContext);
    app.use(requestLogger);
    app.use(express.json());
    app.use(auditLogger);

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.get('/api/docs.json', (_req, res) => {
        res.json(swaggerSpec);
    });
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.use('/api/departments', departmentRoutes);
    app.use('/api/services', serviceCatalogRoutes);
    app.use('/api/staff-position-types', staffPositionTypeRoutes);
    app.use('/api/staff', staffRoutes);
    app.use('/api/patients', patientRoutes);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/medical-records', medicalRecordRoutes);
    app.use('/api/prescriptions', prescriptionRoutes);
    app.use('/api/lab-tests', labTestRoutes);
    app.use('/api/lab-orders', labOrderRoutes);
    app.use('/api/billings', billingRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/feedback', feedbackRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/settings', settingRoutes);
    app.use('/api/audit-logs', auditLogRoutes);
    app.use('/internal/appointments', internalAppointmentRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
