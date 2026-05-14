import { Request, Response } from 'express';
import { z } from 'zod';
import { SettingPrismaRepository } from '../infrastructure/setting.prisma.repository';
import { SettingService } from '../services/setting.service';

const settingKeyParamsSchema = z.object({
    key: z.string().trim().min(1, 'Setting key is required'),
});

const updateSettingSchema = z.object({
    value: z.unknown(),
});

const bulkUpdateSettingsSchema = z.object({
    settings: z
        .array(
            z.object({
                key: z.string().trim().min(1, 'Setting key is required'),
                value: z.unknown(),
            }),
        )
        .min(1, 'At least one setting is required'),
});

export class SettingController {
    private readonly service = new SettingService(new SettingPrismaRepository());

    async list(_req: Request, res: Response) {
        const result = await this.service.getGroupedSettings();

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = settingKeyParamsSchema.parse(req.params);
        const body = updateSettingSchema.parse(req.body);
        const result = await this.service.updateSetting(params.key, body.value, {
            performedByUserId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? undefined,
        });

        return res.status(200).json(result);
    }

    async bulkUpdate(req: Request, res: Response) {
        const body = bulkUpdateSettingsSchema.parse(req.body);
        const result = await this.service.updateSettingsBulk(body.settings, {
            performedByUserId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? undefined,
        });

        return res.status(200).json({
            items: result,
        });
    }
}
