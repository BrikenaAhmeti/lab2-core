import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const workingHourEntrySchema = z
    .object({
        start: z.string().regex(timePattern, 'Time must be in HH:MM format').optional(),
        end: z.string().regex(timePattern, 'Time must be in HH:MM format').optional(),
        isClosed: z.boolean().optional(),
    })
    .superRefine((value, ctx) => {
        if (value.isClosed) {
            return;
        }

        if (!value.start || !value.end) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Working hour entries must include start and end times',
            });
        }
    });

const workingHoursSchema = z.object({}).catchall(workingHourEntrySchema);

export type SettingCategory =
    | 'facility'
    | 'scheduling'
    | 'notifications'
    | 'security'
    | 'system'
    | 'other';

export type SettingDefinition = {
    key: string;
    label: string;
    category: SettingCategory;
    description: string;
    readOnly?: boolean;
    schema: z.ZodType;
};

export const SETTING_DEFINITIONS: SettingDefinition[] = [
    {
        key: 'facility_name',
        label: 'Facility Name',
        category: 'facility',
        description: 'Organization name shown across the platform.',
        schema: z.string().trim().min(2).max(120),
    },
    {
        key: 'default_slot_duration',
        label: 'Default Slot Duration',
        category: 'scheduling',
        description: 'Default appointment slot duration in minutes.',
        schema: z.number().int().min(5).max(240),
    },
    {
        key: 'working_hours',
        label: 'Working Hours',
        category: 'facility',
        description: 'Facility-wide weekly working hours.',
        schema: workingHoursSchema,
    },
    {
        key: 'password_min_length',
        label: 'Password Minimum Length',
        category: 'security',
        description: 'Minimum number of characters required for passwords.',
        schema: z.number().int().min(8).max(128),
    },
    {
        key: 'appointment_reminder_24h',
        label: '24 Hour Reminder',
        category: 'notifications',
        description: 'Enable 24-hour appointment reminders.',
        schema: z.boolean(),
    },
    {
        key: 'appointment_reminder_1h',
        label: '1 Hour Reminder',
        category: 'notifications',
        description: 'Enable 1-hour appointment reminders.',
        schema: z.boolean(),
    },
    {
        key: 'auth.super_admin_reference',
        label: 'Super Admin Reference',
        category: 'system',
        description: 'Auth service reference for the initial Super Admin account.',
        readOnly: true,
        schema: z.object({
            userId: z.string().uuid(),
        }),
    },
];

export const SETTING_DEFINITIONS_BY_KEY = new Map(
    SETTING_DEFINITIONS.map((definition) => [definition.key, definition]),
);
