type OpenApiSchema = Record<string, unknown>;
type OpenApiOperation = Record<string, unknown>;

const ref = (schema: string): OpenApiSchema => ({
    $ref: `#/components/schemas/${schema}`,
});

const arrayOf = (schema: OpenApiSchema): OpenApiSchema => ({
    type: 'array',
    items: schema,
});

const jsonContent = (schema: OpenApiSchema) => ({
    'application/json': {
        schema,
    },
});

const jsonRequest = (schema: OpenApiSchema, required = true) => ({
    required,
    content: jsonContent(schema),
});

const multipartImportRequest = {
    required: true,
    content: {
        'multipart/form-data': {
            schema: ref('ImportFileRequest'),
        },
        'application/json': {
            schema: ref('ImportRowsRequest'),
        },
        'text/csv': {
            schema: {
                type: 'string',
                format: 'binary',
            },
        },
    },
};

const jsonResponse = (description: string, schema: OpenApiSchema = ref('AnyObject')) => ({
    description,
    content: jsonContent(schema),
});

const fileResponse = (description: string, contentType: string) => ({
    description,
    content: {
        [contentType]: {
            schema: {
                type: 'string',
                format: 'binary',
            },
        },
    },
});

const emptyResponse = (description: string) => ({ description });

const errorResponse = (description: string) => ({
    description,
    content: jsonContent(ref('ErrorResponse')),
});

const authResponses = {
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
};

const commonErrorResponses = {
    400: errorResponse('Validation failed'),
    ...authResponses,
};

const idParam = (name = 'id', description = 'Resource id') => ({
    in: 'path',
    name,
    required: true,
    description,
    schema: {
        type: 'string',
        format: 'uuid',
    },
});

const stringParam = (name: string, description?: string) => ({
    in: 'path',
    name,
    required: true,
    description,
    schema: {
        type: 'string',
    },
});

const queryParam = (
    name: string,
    schema: OpenApiSchema,
    description?: string,
) => ({
    in: 'query',
    name,
    description,
    schema,
});

const pageParams = [
    queryParam('page', { type: 'integer', minimum: 1, default: 1 }),
    queryParam('limit', { type: 'integer', minimum: 1, maximum: 100, default: 10 }),
];

const dateRangeParams = [
    queryParam('from', { type: 'string', format: 'date-time' }),
    queryParam('to', { type: 'string', format: 'date-time' }),
];

const reportParams = [
    ...dateRangeParams,
    queryParam('groupBy', { type: 'string' }),
    queryParam('departmentId', { type: 'string', format: 'uuid' }),
    queryParam('staffProfileId', { type: 'string', format: 'uuid' }),
    queryParam('serviceCatalogId', { type: 'string', format: 'uuid' }),
    queryParam('status', { type: 'string' }),
    queryParam('export', { type: 'string', enum: ['csv', 'xlsx', 'pdf'] }),
];

const commonSearchParams = [
    ...pageParams,
    queryParam('search', { type: 'string' }),
    queryParam('q', { type: 'string' }, 'Alias for search'),
    queryParam('sortBy', { type: 'string' }),
    queryParam('sortOrder', { type: 'string', enum: ['asc', 'desc'], default: 'desc' }),
];

const operation = ({
    tags,
    summary,
    description,
    parameters,
    requestBody,
    responses,
    security,
}: {
    tags: string[];
    summary: string;
    description?: string;
    parameters?: unknown[];
    requestBody?: unknown;
    responses: Record<string | number, unknown>;
    security?: unknown[];
}): OpenApiOperation => {
    const item: OpenApiOperation = {
        tags,
        summary,
        responses,
    };

    if (description) item.description = description;
    if (parameters?.length) item.parameters = parameters;
    if (requestBody) item.requestBody = requestBody;
    if (security) item.security = security;

    return item;
};

const objectSchema = (properties: Record<string, OpenApiSchema>, required?: string[]) => ({
    type: 'object',
    ...(required ? { required } : {}),
    properties,
});

const listResponse = (schema: OpenApiSchema) =>
    objectSchema({
        items: arrayOf(schema),
        meta: ref('PaginationMeta'),
    });

const anyValue = {
    nullable: true,
    oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'object', additionalProperties: true },
        { type: 'array', items: {} },
    ],
};

const timestamps = {
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
};

const auditFields = {
    createdBy: { type: 'string', format: 'uuid', nullable: true },
    updatedBy: { type: 'string', format: 'uuid', nullable: true },
};

const uuid = { type: 'string', format: 'uuid' };
const nullableUuid = { type: 'string', format: 'uuid', nullable: true };
const nullableString = { type: 'string', nullable: true };
const nullableDateTime = { type: 'string', format: 'date-time', nullable: true };

const appointmentStatuses = [
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
];

const appointmentTypes = ['IN_PERSON', 'VIRTUAL', 'WALK_IN', 'FOLLOW_UP'];
const employmentStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];
const bloodTypes = [
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
    'UNKNOWN',
];
const labOrderStatuses = ['PENDING', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const labOrderStatusInputs = [
    'pending',
    'sample_collected',
    'collected',
    'in_progress',
    'completed',
    'cancelled',
];
const labResultStatuses = ['PENDING', 'ENTERED', 'REVIEWED', 'ABNORMAL', 'CRITICAL'];
const pharmacyStatuses = [
    'PENDING',
    'IN_PROGRESS',
    'ON_HOLD',
    'PARTIALLY_DISPENSED',
    'DISPENSED',
    'FULFILLED',
    'OUT_OF_STOCK',
    'SUBSTITUTED',
    'CANCELLED',
];
const billingStatuses = ['DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE'];
const paymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER'];
const reportTypes = [
    'appointments',
    'clinical',
    'financial',
    'inventory',
    'patients',
    'staff_workload',
];
const exchangeFormats = ['csv', 'xlsx', 'json'];
const exportEntities = [
    'patients',
    'appointments',
    'lab-results',
    'inventory-items',
    'billings',
    'audit-logs',
];
const importEntities = [
    'patients',
    'inventory-items',
    'lab-tests',
    'service-catalog',
    'staff',
];

const schemas = {
    AnyObject: {
        type: 'object',
        additionalProperties: true,
    },
    HealthResponse: objectSchema({
        status: { type: 'string', example: 'ok' },
    }),
    ErrorResponse: objectSchema({
        message: { type: 'string', example: 'Validation failed' },
    }),
    PaginationMeta: objectSchema({
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        total: { type: 'integer', example: 42 },
        totalPages: { type: 'integer', example: 5 },
    }),
    AppointmentStatus: { type: 'string', enum: appointmentStatuses },
    AppointmentType: { type: 'string', enum: appointmentTypes },
    EmploymentStatus: { type: 'string', enum: employmentStatuses },
    BloodType: { type: 'string', enum: bloodTypes },
    LabOrderStatus: { type: 'string', enum: labOrderStatuses },
    LabResultStatus: { type: 'string', enum: labResultStatuses },
    PharmacyStatus: { type: 'string', enum: pharmacyStatuses },
    BillingStatus: { type: 'string', enum: billingStatuses },
    PaymentMethod: { type: 'string', enum: paymentMethods },

    Department: objectSchema({
        id: uuid,
        name: { type: 'string', example: 'Cardiology' },
        description: { ...nullableString, example: 'Heart care' },
        floor: { ...nullableString, example: '2' },
        phoneExtension: { ...nullableString, example: '204' },
        operatingHours: { type: 'object', nullable: true, additionalProperties: true },
        isActive: { type: 'boolean', example: true },
        sortOrder: { type: 'integer', example: 0 },
        ...timestamps,
        ...auditFields,
    }),
    DepartmentListResponse: listResponse(ref('Department')),
    CreateDepartmentRequest: objectSchema(
        {
            name: { type: 'string', example: 'Cardiology' },
            description: { type: 'string', example: 'Heart care' },
            floor: { type: 'string', example: '2' },
            phoneExtension: { type: 'string', example: '204' },
            operatingHours: { type: 'object', additionalProperties: true },
            isActive: { type: 'boolean', example: true },
            sortOrder: { type: 'integer', example: 0 },
        },
        ['name'],
    ),
    UpdateDepartmentRequest: objectSchema({
        name: { type: 'string', example: 'Radiology' },
        description: nullableString,
        floor: nullableString,
        phoneExtension: nullableString,
        operatingHours: { type: 'object', nullable: true, additionalProperties: true },
        isActive: { type: 'boolean' },
        sortOrder: { type: 'integer' },
    }),

    ServiceCatalog: objectSchema({
        id: uuid,
        departmentId: uuid,
        department: { allOf: [ref('Department')], nullable: true },
        name: { type: 'string', example: 'Initial Consultation' },
        description: nullableString,
        defaultDurationMinutes: { type: 'integer', example: 30 },
        defaultPrice: { type: 'number', example: 50 },
        isActive: { type: 'boolean', example: true },
        sortOrder: { type: 'integer', example: 0 },
        ...timestamps,
        ...auditFields,
    }),
    ServiceCatalogListResponse: listResponse(ref('ServiceCatalog')),
    CreateServiceCatalogRequest: objectSchema(
        {
            departmentId: uuid,
            name: { type: 'string', example: 'Initial Consultation' },
            description: { type: 'string' },
            defaultDurationMinutes: { type: 'integer', minimum: 1, example: 30 },
            defaultPrice: { type: 'number', minimum: 0, example: 50 },
            isActive: { type: 'boolean', example: true },
            sortOrder: { type: 'integer', example: 0 },
        },
        ['departmentId', 'name', 'defaultDurationMinutes', 'defaultPrice'],
    ),
    UpdateServiceCatalogRequest: objectSchema({
        departmentId: uuid,
        name: { type: 'string' },
        description: nullableString,
        defaultDurationMinutes: { type: 'integer', minimum: 1 },
        defaultPrice: { type: 'number', minimum: 0 },
        isActive: { type: 'boolean' },
        sortOrder: { type: 'integer' },
    }),

    StaffPositionTypeDepartment: objectSchema({
        id: uuid,
        name: { type: 'string', example: 'Radiology' },
        isActive: { type: 'boolean', example: true },
    }),
    StaffPositionType: objectSchema({
        id: uuid,
        name: { type: 'string', example: 'Radiologic Technologist' },
        description: nullableString,
        defaultRoleKey: { type: 'string', example: 'lab_technician' },
        defaultRoleName: { type: 'string', example: 'Lab Technician' },
        applicableDepartmentIds: { type: 'array', nullable: true, items: uuid },
        applicableDepartments: arrayOf(ref('StaffPositionTypeDepartment')),
        isActive: { type: 'boolean', example: true },
        ...timestamps,
        ...auditFields,
    }),
    StaffPositionTypeListResponse: objectSchema({
        items: arrayOf(ref('StaffPositionType')),
    }),
    CreateStaffPositionTypeRequest: objectSchema(
        {
            name: { type: 'string', example: 'Radiologic Technologist' },
            description: { type: 'string' },
            defaultRoleKey: { type: 'string', example: 'lab_technician' },
            applicableDepartmentIds: { type: 'array', items: uuid },
            isActive: { type: 'boolean', example: true },
        },
        ['name', 'defaultRoleKey'],
    ),
    UpdateStaffPositionTypeRequest: objectSchema({
        name: { type: 'string' },
        description: nullableString,
        defaultRoleKey: { type: 'string' },
        applicableDepartmentIds: { type: 'array', nullable: true, items: uuid },
        isActive: { type: 'boolean' },
    }),

    StaffDepartmentAssignment: objectSchema({
        id: uuid,
        staffProfileId: uuid,
        departmentId: uuid,
        isPrimary: { type: 'boolean' },
        assignedAt: { type: 'string', format: 'date-time' },
        unassignedAt: nullableDateTime,
        department: { allOf: [ref('Department')], nullable: true },
    }),
    StaffProfile: objectSchema({
        id: uuid,
        userId: uuid,
        staffPositionTypeId: uuid,
        employeeCode: { type: 'string', example: 'EMP-001' },
        specialization: nullableString,
        licenseNumber: nullableString,
        employmentStatus: ref('EmploymentStatus'),
        hireDate: { type: 'string', format: 'date', nullable: true },
        terminationDate: { type: 'string', format: 'date', nullable: true },
        bio: nullableString,
        isPublicProfile: { type: 'boolean' },
        staffPositionType: { allOf: [ref('StaffPositionType')], nullable: true },
        departments: arrayOf(ref('StaffDepartmentAssignment')),
        ...timestamps,
        ...auditFields,
    }),
    StaffProfileListResponse: listResponse(ref('StaffProfile')),
    CreateStaffProfileRequest: objectSchema(
        {
            userId: uuid,
            staffPositionTypeId: uuid,
            employeeCode: { type: 'string', example: 'EMP-001' },
            specialization: { type: 'string' },
            licenseNumber: { type: 'string' },
            employmentStatus: ref('EmploymentStatus'),
            hireDate: { type: 'string', format: 'date' },
            bio: { type: 'string' },
            isPublicProfile: { type: 'boolean' },
            departmentIds: { type: 'array', items: uuid },
            departments: {
                type: 'array',
                items: objectSchema({
                    departmentId: uuid,
                    isPrimary: { type: 'boolean' },
                }),
            },
        },
        ['userId', 'staffPositionTypeId', 'employeeCode'],
    ),
    UpdateStaffProfileRequest: objectSchema({
        staffPositionTypeId: uuid,
        employeeCode: { type: 'string' },
        specialization: nullableString,
        licenseNumber: nullableString,
        employmentStatus: ref('EmploymentStatus'),
        hireDate: { type: 'string', format: 'date', nullable: true },
        terminationDate: { type: 'string', format: 'date', nullable: true },
        bio: nullableString,
        isPublicProfile: { type: 'boolean' },
    }),
    StaffDepartmentRequest: objectSchema(
        {
            departmentId: uuid,
            isPrimary: { type: 'boolean' },
        },
        ['departmentId'],
    ),
    RemoveStaffDepartmentRequest: objectSchema(
        {
            departmentId: uuid,
        },
        ['departmentId'],
    ),

    StaffScheduleDay: objectSchema({
        dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
        isActive: { type: 'boolean' },
        departmentId: nullableUuid,
        startTime: { type: 'string', nullable: true, example: '08:00' },
        endTime: { type: 'string', nullable: true, example: '16:00' },
        slotDurationMinutes: { type: 'integer', nullable: true, minimum: 5, maximum: 480 },
        breakStart: { type: 'string', nullable: true, example: '12:00' },
        breakEnd: { type: 'string', nullable: true, example: '12:30' },
    }),
    WeeklyScheduleRequest: objectSchema(
        {
            days: {
                type: 'array',
                minItems: 7,
                maxItems: 7,
                items: ref('StaffScheduleDay'),
            },
        },
        ['days'],
    ),
    WeeklyScheduleResponse: objectSchema({
        staffProfileId: uuid,
        days: arrayOf(ref('StaffScheduleDay')),
    }),
    ScheduleException: objectSchema({
        id: uuid,
        staffProfileId: uuid,
        departmentId: nullableUuid,
        exceptionDate: { type: 'string', format: 'date' },
        startTime: { type: 'string', nullable: true },
        endTime: { type: 'string', nullable: true },
        isUnavailable: { type: 'boolean' },
        reason: nullableString,
        ...timestamps,
        ...auditFields,
    }),
    CreateScheduleExceptionRequest: objectSchema(
        {
            departmentId: nullableUuid,
            exceptionDate: { type: 'string', format: 'date' },
            isUnavailable: { type: 'boolean', default: true },
            startTime: { type: 'string', nullable: true, example: '10:00' },
            endTime: { type: 'string', nullable: true, example: '12:00' },
            reason: nullableString,
        },
        ['exceptionDate'],
    ),
    DeleteScheduleExceptionRequest: objectSchema(
        {
            exceptionId: uuid,
        },
        ['exceptionId'],
    ),
    AvailableSlot: objectSchema({
        startAt: { type: 'string', format: 'date-time' },
        endAt: { type: 'string', format: 'date-time' },
        durationMinutes: { type: 'integer' },
    }),

    Patient: objectSchema({
        id: uuid,
        userId: nullableUuid,
        firstName: { type: 'string', example: 'Ada' },
        lastName: { type: 'string', example: 'Lovelace' },
        email: { type: 'string', format: 'email', nullable: true },
        phone: nullableString,
        dateOfBirth: { type: 'string', format: 'date', nullable: true },
        gender: nullableString,
        bloodType: { allOf: [ref('BloodType')], nullable: true },
        address: nullableString,
        emergencyContact: nullableString,
        emergencyPhone: nullableString,
        allergies: { type: 'object', nullable: true, additionalProperties: true },
        medicalNotes: { type: 'object', nullable: true, additionalProperties: true },
        isActive: { type: 'boolean' },
        ...timestamps,
        ...auditFields,
    }),
    PatientListResponse: listResponse(ref('Patient')),
    CreatePatientRequest: objectSchema(
        {
            userId: nullableUuid,
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            phone: nullableString,
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            gender: nullableString,
            bloodType: { allOf: [ref('BloodType')], nullable: true },
            personalNumber: nullableString,
            address: nullableString,
            emergencyContact: nullableString,
            emergencyPhone: nullableString,
            allergies: { type: 'object', nullable: true, additionalProperties: true },
            medicalNotes: { type: 'object', nullable: true, additionalProperties: true },
        },
        ['firstName', 'lastName'],
    ),
    UpdatePatientRequest: objectSchema({
        userId: nullableUuid,
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email', nullable: true },
        phone: nullableString,
        dateOfBirth: { type: 'string', format: 'date', nullable: true },
        gender: nullableString,
        bloodType: { allOf: [ref('BloodType')], nullable: true },
        personalNumber: nullableString,
        address: nullableString,
        emergencyContact: nullableString,
        emergencyPhone: nullableString,
        allergies: { type: 'object', nullable: true, additionalProperties: true },
        medicalNotes: { type: 'object', nullable: true, additionalProperties: true },
        isActive: { type: 'boolean' },
    }),
    LinkPatientByPersonalNumberRequest: objectSchema(
        {
            userId: uuid,
            personalNumber: { type: 'string' },
        },
        ['userId', 'personalNumber'],
    ),
    LinkPatientByPersonalNumberResponse: objectSchema(
        {
            linked: { type: 'boolean' },
            patientId: nullableUuid,
            userId: uuid,
        },
        ['linked', 'patientId', 'userId'],
    ),
    PatientTimelineResponse: objectSchema({
        patient: ref('Patient'),
        appointments: arrayOf(ref('Appointment')),
        medicalRecords: arrayOf(ref('MedicalRecord')),
        prescriptions: arrayOf(ref('Prescription')),
        labOrders: arrayOf(ref('LabOrder')),
        billings: arrayOf(ref('Billing')),
    }),

    Appointment: objectSchema({
        id: uuid,
        patientId: uuid,
        departmentId: uuid,
        serviceCatalogId: uuid,
        staffProfileId: nullableUuid,
        status: ref('AppointmentStatus'),
        appointmentType: ref('AppointmentType'),
        scheduledAt: { type: 'string', format: 'date-time' },
        endAt: { type: 'string', format: 'date-time' },
        durationMinutes: { type: 'integer' },
        basePrice: { type: 'number' },
        notes: nullableString,
        checkedInAt: nullableDateTime,
        completedAt: nullableDateTime,
        cancelledAt: nullableDateTime,
        cancellationNote: nullableString,
        patient: { allOf: [ref('Patient')], nullable: true },
        department: { allOf: [ref('Department')], nullable: true },
        serviceCatalog: { allOf: [ref('ServiceCatalog')], nullable: true },
        staffProfile: { allOf: [ref('StaffProfile')], nullable: true },
        ...timestamps,
        ...auditFields,
    }),
    AppointmentListResponse: listResponse(ref('Appointment')),
    BookAppointmentRequest: objectSchema(
        {
            patientId: uuid,
            serviceCatalogId: uuid,
            staffProfileId: uuid,
            scheduledAt: { type: 'string', format: 'date-time' },
            appointmentType: ref('AppointmentType'),
            notes: nullableString,
        },
        ['patientId', 'serviceCatalogId', 'staffProfileId', 'scheduledAt'],
    ),
    RescheduleAppointmentRequest: objectSchema(
        {
            scheduledAt: { type: 'string', format: 'date-time' },
            serviceCatalogId: uuid,
            staffProfileId: uuid,
            appointmentType: ref('AppointmentType'),
            notes: nullableString,
        },
        ['scheduledAt'],
    ),
    UpdateAppointmentStatusRequest: objectSchema({
        status: ref('AppointmentStatus'),
        action: {
            type: 'string',
            enum: ['confirm', 'check-in', 'check_in', 'start', 'complete', 'cancel', 'no-show', 'no_show'],
        },
        reason: nullableString,
    }),

    MedicalRecord: objectSchema({
        id: uuid,
        patientId: uuid,
        appointmentId: nullableUuid,
        staffProfileId: uuid,
        departmentId: uuid,
        chiefComplaint: nullableString,
        vitals: { type: 'object', nullable: true, additionalProperties: true },
        diagnosis: nullableString,
        treatmentPlan: nullableString,
        notes: nullableString,
        followUpInstructions: nullableString,
        isFinalized: { type: 'boolean' },
        amendments: arrayOf(ref('MedicalRecordAmendment')),
        ...timestamps,
        ...auditFields,
    }),
    MedicalRecordListResponse: listResponse(ref('MedicalRecord')),
    MedicalRecordFields: objectSchema({
        chiefComplaint: nullableString,
        vitals: { type: 'object', nullable: true, additionalProperties: true },
        diagnosis: nullableString,
        treatmentPlan: nullableString,
        notes: nullableString,
        followUpInstructions: nullableString,
    }),
    CreateMedicalRecordRequest: {
        allOf: [
            ref('MedicalRecordFields'),
            objectSchema(
                {
                    patientId: uuid,
                    appointmentId: uuid,
                    staffProfileId: uuid,
                },
                ['patientId', 'appointmentId', 'staffProfileId'],
            ),
        ],
    },
    UpdateMedicalRecordRequest: ref('MedicalRecordFields'),
    MedicalRecordAmendment: objectSchema({
        id: uuid,
        medicalRecordId: uuid,
        amendedByUserId: uuid,
        reason: { type: 'string' },
        previousSnapshot: { type: 'object', nullable: true, additionalProperties: true },
        ...timestamps,
        ...auditFields,
    }),
    AddMedicalRecordAmendmentRequest: objectSchema(
        {
            reason: { type: 'string' },
            changes: ref('UpdateMedicalRecordRequest'),
        },
        ['reason', 'changes'],
    ),

    PrescriptionItem: objectSchema({
        id: uuid,
        prescriptionId: uuid,
        medicationName: { type: 'string' },
        dosage: { type: 'string' },
        frequency: { type: 'string' },
        durationInstructions: nullableString,
        quantityPrescribed: { type: 'integer' },
        quantityDispensed: { type: 'integer', nullable: true },
        notes: nullableString,
        ...timestamps,
        ...auditFields,
    }),
    Prescription: objectSchema({
        id: uuid,
        patientId: uuid,
        medicalRecordId: nullableUuid,
        appointmentId: nullableUuid,
        staffProfileId: uuid,
        issuedAt: { type: 'string', format: 'date-time' },
        expiresAt: nullableDateTime,
        notes: nullableString,
        isVoided: { type: 'boolean' },
        voidedAt: nullableDateTime,
        voidReason: nullableString,
        voidedByUserId: nullableUuid,
        items: arrayOf(ref('PrescriptionItem')),
        ...timestamps,
        ...auditFields,
    }),
    PrescriptionListResponse: listResponse(ref('Prescription')),
    CreatePrescriptionRequest: objectSchema(
        {
            medicalRecordId: uuid,
            expiresAt: nullableDateTime,
            notes: nullableString,
            items: {
                type: 'array',
                minItems: 1,
                maxItems: 50,
                items: objectSchema(
                    {
                        medicationName: { type: 'string' },
                        dosage: { type: 'string' },
                        frequency: { type: 'string' },
                        durationInstructions: nullableString,
                        quantityPrescribed: { type: 'integer', minimum: 1 },
                        notes: nullableString,
                    },
                    ['medicationName', 'dosage', 'frequency', 'quantityPrescribed'],
                ),
            },
        },
        ['medicalRecordId', 'items'],
    ),
    VoidPrescriptionRequest: objectSchema(
        {
            reason: { type: 'string' },
        },
        ['reason'],
    ),

    LabTest: objectSchema({
        id: uuid,
        code: { type: 'string', example: 'CBC' },
        name: { type: 'string', example: 'Complete Blood Count' },
        description: nullableString,
        category: nullableString,
        sampleType: nullableString,
        defaultPrice: { type: 'number', nullable: true },
        referenceRange: nullableString,
        isActive: { type: 'boolean' },
        ...timestamps,
        ...auditFields,
    }),
    LabTestListResponse: listResponse(ref('LabTest')),
    CreateLabTestRequest: objectSchema(
        {
            code: { type: 'string' },
            name: { type: 'string' },
            description: nullableString,
            category: nullableString,
            sampleType: nullableString,
            defaultPrice: { type: 'number', nullable: true },
            referenceRange: nullableString,
            isActive: { type: 'boolean' },
        },
        ['code', 'name'],
    ),
    UpdateLabTestRequest: objectSchema({
        code: { type: 'string' },
        name: { type: 'string' },
        description: nullableString,
        category: nullableString,
        sampleType: nullableString,
        defaultPrice: { type: 'number', nullable: true },
        referenceRange: nullableString,
        isActive: { type: 'boolean' },
    }),
    LabOrderItem: objectSchema({
        id: uuid,
        labOrderId: uuid,
        labTestId: uuid,
        resultValue: nullableString,
        resultUnit: nullableString,
        resultNotes: nullableString,
        resultStatus: ref('LabResultStatus'),
        isCritical: { type: 'boolean' },
        completedAt: nullableDateTime,
        labTest: { allOf: [ref('LabTest')], nullable: true },
        ...timestamps,
        ...auditFields,
    }),
    LabOrder: objectSchema({
        id: uuid,
        patientId: uuid,
        appointmentId: nullableUuid,
        medicalRecordId: nullableUuid,
        orderedByStaffId: uuid,
        departmentId: uuid,
        status: ref('LabOrderStatus'),
        priority: nullableString,
        notes: nullableString,
        orderedAt: { type: 'string', format: 'date-time' },
        collectedAt: nullableDateTime,
        completedAt: nullableDateTime,
        reviewedAt: nullableDateTime,
        items: arrayOf(ref('LabOrderItem')),
        ...timestamps,
        ...auditFields,
    }),
    LabOrderListResponse: listResponse(ref('LabOrder')),
    CreateLabOrderRequest: objectSchema(
        {
            patientId: uuid,
            appointmentId: uuid,
            medicalRecordId: nullableUuid,
            orderedByStaffId: uuid,
            priority: { type: 'string', enum: ['normal', 'urgent'], nullable: true },
            notes: nullableString,
            tests: { type: 'array', minItems: 1, maxItems: 100, items: uuid },
        },
        ['patientId', 'appointmentId', 'orderedByStaffId', 'tests'],
    ),
    UpdateLabOrderStatusRequest: objectSchema(
        {
            status: { type: 'string', enum: labOrderStatusInputs },
        },
        ['status'],
    ),
    EnterLabOrderResultsRequest: objectSchema(
        {
            items: {
                type: 'array',
                minItems: 1,
                maxItems: 100,
                items: objectSchema(
                    {
                        itemId: uuid,
                        resultValue: { type: 'string' },
                        resultUnit: nullableString,
                        resultNotes: nullableString,
                    },
                    ['itemId', 'resultValue'],
                ),
            },
        },
        ['items'],
    ),
    ReviewLabOrderRequest: objectSchema({
        notes: nullableString,
    }),
    TriggerAiResponse: objectSchema({
        labOrderId: uuid,
        status: { type: 'string', enum: ['queued', 'not_configured'], example: 'queued' },
        message: {
            type: 'string',
            example: 'AI service URL or internal API key is not configured',
        },
    }),

    BillingItem: objectSchema({
        id: uuid,
        billingId: uuid,
        serviceCatalogId: nullableUuid,
        inventoryItemId: nullableUuid,
        description: { type: 'string' },
        quantity: { type: 'number' },
        unitPrice: { type: 'number' },
        totalPrice: { type: 'number' },
        sourceEntityType: nullableString,
        sourceEntityId: nullableString,
        ...timestamps,
        ...auditFields,
    }),
    Payment: objectSchema({
        id: uuid,
        billingId: uuid,
        amount: { type: 'number' },
        paymentMethod: ref('PaymentMethod'),
        referenceNumber: nullableString,
        paidAt: { type: 'string', format: 'date-time' },
        receivedByUserId: nullableUuid,
        notes: nullableString,
        ...timestamps,
        ...auditFields,
    }),
    Billing: objectSchema({
        id: uuid,
        patientId: uuid,
        appointmentId: nullableUuid,
        billingNumber: { type: 'string' },
        status: ref('BillingStatus'),
        subtotal: { type: 'number' },
        taxAmount: { type: 'number' },
        discountAmount: { type: 'number' },
        totalAmount: { type: 'number' },
        amountPaid: { type: 'number' },
        dueDate: { type: 'string', format: 'date', nullable: true },
        issuedAt: { type: 'string', format: 'date-time' },
        paidAt: nullableDateTime,
        notes: nullableString,
        items: arrayOf(ref('BillingItem')),
        payments: arrayOf(ref('Payment')),
        ...timestamps,
        ...auditFields,
    }),
    BillingListResponse: listResponse(ref('Billing')),
    UpdateBillingRequest: objectSchema({
        taxAmount: { type: 'number', minimum: 0 },
        discountAmount: { type: 'number', minimum: 0 },
        dueDate: nullableDateTime,
        notes: nullableString,
        items: {
            type: 'array',
            maxItems: 100,
            items: objectSchema(
                {
                    serviceCatalogId: nullableUuid,
                    inventoryItemId: nullableUuid,
                    description: { type: 'string' },
                    quantity: { type: 'number', minimum: 0 },
                    unitPrice: { type: 'number', minimum: 0 },
                    sourceEntityType: nullableString,
                    sourceEntityId: nullableString,
                },
                ['description', 'quantity', 'unitPrice'],
            ),
        },
    }),
    RecordPaymentRequest: objectSchema(
        {
            amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
            paymentMethod: ref('PaymentMethod'),
            referenceNumber: nullableString,
            notes: nullableString,
        },
        ['amount', 'paymentMethod'],
    ),
    BillingStats: objectSchema({
        totalBilled: { type: 'number' },
        totalPaid: { type: 'number' },
        outstanding: { type: 'number' },
        byStatus: { type: 'object', additionalProperties: { type: 'number' } },
    }),

    PharmacyDispensingItem: objectSchema({
        id: uuid,
        pharmacyQueueId: uuid,
        prescriptionItemId: uuid,
        inventoryItemId: nullableUuid,
        quantityToDispense: { type: 'integer' },
        quantityDispensed: { type: 'integer', nullable: true },
        status: ref('PharmacyStatus'),
        notes: nullableString,
        ...timestamps,
        ...auditFields,
    }),
    PharmacyQueue: objectSchema({
        id: uuid,
        prescriptionId: uuid,
        patientId: uuid,
        status: ref('PharmacyStatus'),
        requestedAt: { type: 'string', format: 'date-time' },
        processedAt: nullableDateTime,
        notes: nullableString,
        dispensingItems: arrayOf(ref('PharmacyDispensingItem')),
        ...timestamps,
        ...auditFields,
    }),
    PharmacyQueueListResponse: listResponse(ref('PharmacyQueue')),
    DispensePharmacyQueueRequest: objectSchema(
        {
            items: {
                type: 'array',
                minItems: 1,
                maxItems: 100,
                items: objectSchema(
                    {
                        prescriptionItemId: uuid,
                        inventoryItemId: nullableUuid,
                        quantityDispensed: { type: 'integer', minimum: 0 },
                        status: { type: 'string', enum: ['dispensed', 'out_of_stock', 'substituted'] },
                        notes: nullableString,
                    },
                    ['prescriptionItemId', 'status'],
                ),
            },
        },
        ['items'],
    ),

    Feedback: objectSchema({
        id: uuid,
        patientId: uuid,
        appointmentId: nullableUuid,
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: nullableString,
        status: { type: 'string', enum: ['pending', 'published', 'hidden'] },
        isAnonymous: { type: 'boolean' },
        submittedAt: { type: 'string', format: 'date-time' },
        ...timestamps,
        ...auditFields,
    }),
    FeedbackListResponse: listResponse(ref('Feedback')),
    SubmitFeedbackRequest: objectSchema(
        {
            appointmentId: uuid,
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: nullableString,
            isAnonymous: { type: 'boolean' },
        },
        ['appointmentId', 'rating'],
    ),
    UpdateFeedbackStatusRequest: objectSchema(
        {
            status: { type: 'string', enum: ['pending', 'published', 'hidden'] },
        },
        ['status'],
    ),

    ContactMessage: objectSchema({
        id: uuid,
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: nullableString,
        subject: { type: 'string' },
        message: { type: 'string' },
        status: { type: 'string', enum: ['new', 'read', 'replied'] },
        replyNotes: nullableString,
        repliedAt: nullableDateTime,
        ...timestamps,
        ...auditFields,
    }),
    ContactMessageListResponse: listResponse(ref('ContactMessage')),
    SubmitContactMessageRequest: objectSchema(
        {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: nullableString,
            subject: { type: 'string' },
            message: { type: 'string' },
        },
        ['name', 'email', 'subject', 'message'],
    ),
    UpdateContactStatusRequest: objectSchema(
        {
            status: { type: 'string', enum: ['new', 'read', 'replied'] },
            replyNotes: nullableString,
        },
        ['status'],
    ),

    DashboardStats: {
        type: 'object',
        additionalProperties: true,
    },
    ReportResult: objectSchema({
        type: { type: 'string', enum: reportTypes },
        title: { type: 'string' },
        filters: { type: 'object', additionalProperties: true },
        summary: { type: 'array', items: ref('AnyObject') },
        rows: { type: 'array', items: ref('AnyObject') },
        generatedAt: { type: 'string', format: 'date-time' },
    }),
    ReportTemplate: objectSchema({
        id: { type: 'string' },
        name: { type: 'string' },
        description: nullableString,
        reportType: { type: 'string', enum: reportTypes },
        parameters: { type: 'object', additionalProperties: true },
        createdBy: nullableUuid,
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    }),
    ReportTemplateListResponse: objectSchema({
        items: arrayOf(ref('ReportTemplate')),
    }),
    SaveReportTemplateRequest: objectSchema(
        {
            name: { type: 'string' },
            description: nullableString,
            reportType: { type: 'string', enum: reportTypes },
            parameters: { type: 'object', additionalProperties: true, default: {} },
        },
        ['name', 'reportType'],
    ),
    SearchResultResponse: listResponse(ref('AnyObject')),
    ImportFileRequest: objectSchema(
        {
            file: { type: 'string', format: 'binary' },
        },
        ['file'],
    ),
    ImportRowsRequest: objectSchema(
        {
            rows: { type: 'array', items: ref('AnyObject') },
            mode: { type: 'string', enum: ['strict', 'lenient'], default: 'strict' },
            async: { type: 'string', enum: ['true', 'false'] },
        },
        ['rows'],
    ),
    ImportResult: objectSchema({
        entity: { type: 'string', enum: importEntities },
        inserted: { type: 'integer' },
        updated: { type: 'integer' },
        skipped: { type: 'integer' },
        errors: { type: 'array', items: ref('AnyObject') },
    }),
    ImportJob: objectSchema({
        id: uuid,
        status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed'] },
        result: { allOf: [ref('ImportResult')], nullable: true },
        error: nullableString,
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    }),

    GroupedSettingItem: objectSchema({
        key: { type: 'string', example: 'facility_name' },
        label: { type: 'string', example: 'Facility Name' },
        description: { type: 'string', example: 'Organization name shown across the platform.' },
        category: { type: 'string', example: 'facility' },
        value: anyValue,
        isPublic: { type: 'boolean', example: false },
        readOnly: { type: 'boolean', example: false },
        updatedAt: { type: 'string', format: 'date-time' },
        updatedBy: nullableUuid,
    }),
    GroupedSettingsCategory: objectSchema({
        label: { type: 'string', example: 'Facility' },
        settings: arrayOf(ref('GroupedSettingItem')),
    }),
    GroupedSettingsResponse: {
        type: 'object',
        additionalProperties: ref('GroupedSettingsCategory'),
    },
    UpdateSettingRequest: objectSchema(
        {
            value: anyValue,
        },
        ['value'],
    ),
    BulkUpdateSettingsRequest: objectSchema(
        {
            settings: {
                type: 'array',
                items: objectSchema(
                    {
                        key: { type: 'string' },
                        value: anyValue,
                    },
                    ['key', 'value'],
                ),
            },
        },
        ['settings'],
    ),
    BulkUpdateSettingsResponse: objectSchema({
        items: arrayOf(ref('GroupedSettingItem')),
    }),
    AuditLog: objectSchema({
        id: uuid,
        entityType: { type: 'string' },
        entityId: nullableString,
        action: { type: 'string' },
        performedByUserId: nullableUuid,
        ipAddress: nullableString,
        userAgent: nullableString,
        oldValue: { type: 'object', nullable: true, additionalProperties: true },
        newValue: { type: 'object', nullable: true, additionalProperties: true },
        requestId: nullableString,
        metadata: { type: 'object', nullable: true, additionalProperties: true },
        createdAt: { type: 'string', format: 'date-time' },
    }),
    AuditLogListResponse: listResponse(ref('AuditLog')),
};

const paths = {
    '/health': {
        get: operation({
            tags: ['Health'],
            summary: 'Health check',
            security: [],
            responses: {
                200: jsonResponse('Service is healthy', ref('HealthResponse')),
            },
        }),
    },
    '/api/docs.json': {
        get: operation({
            tags: ['Health'],
            summary: 'Download the OpenAPI document',
            security: [],
            responses: {
                200: jsonResponse('OpenAPI document', ref('AnyObject')),
            },
        }),
    },

    '/api/departments': {
        get: operation({
            tags: ['Departments'],
            summary: 'List departments',
            parameters: [
                ...pageParams,
                queryParam('search', { type: 'string' }),
                queryParam('isActive', { type: 'boolean' }),
                queryParam('sortBy', { type: 'string', enum: ['name', 'sortOrder', 'createdAt', 'updatedAt'] }),
                queryParam('sortDirection', { type: 'string', enum: ['asc', 'desc'] }),
            ],
            responses: {
                200: jsonResponse('Paginated department list', ref('DepartmentListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Departments'],
            summary: 'Create a department',
            requestBody: jsonRequest(ref('CreateDepartmentRequest')),
            responses: {
                201: jsonResponse('Department created', ref('Department')),
                ...commonErrorResponses,
                409: errorResponse('Department already exists'),
            },
        }),
    },
    '/api/departments/{id}': {
        get: operation({
            tags: ['Departments'],
            summary: 'Get a department by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Department details', ref('Department')),
                ...authResponses,
                404: errorResponse('Department not found'),
            },
        }),
        patch: operation({
            tags: ['Departments'],
            summary: 'Update a department',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateDepartmentRequest')),
            responses: {
                200: jsonResponse('Department updated', ref('Department')),
                ...commonErrorResponses,
                404: errorResponse('Department not found'),
                409: errorResponse('Department already exists'),
            },
        }),
        delete: operation({
            tags: ['Departments'],
            summary: 'Deactivate a department',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Department deactivated', ref('Department')),
                ...authResponses,
                404: errorResponse('Department not found'),
            },
        }),
    },
    '/api/departments/{id}/staff': {
        get: operation({
            tags: ['Staff'],
            summary: 'List staff assigned to a department',
            parameters: [
                idParam(),
                ...pageParams,
                queryParam('status', { type: 'string', enum: employmentStatuses }),
                queryParam('search', { type: 'string' }),
            ],
            responses: {
                200: jsonResponse('Department staff list', ref('StaffProfileListResponse')),
                ...authResponses,
            },
        }),
    },

    '/api/services': {
        get: operation({
            tags: ['Service Catalog'],
            summary: 'List service catalog entries',
            parameters: [
                ...pageParams,
                queryParam('search', { type: 'string' }),
                queryParam('departmentId', uuid),
                queryParam('isActive', { type: 'boolean' }),
                queryParam('sortBy', {
                    type: 'string',
                    enum: ['name', 'sortOrder', 'defaultDurationMinutes', 'defaultPrice', 'createdAt', 'updatedAt'],
                }),
                queryParam('sortDirection', { type: 'string', enum: ['asc', 'desc'] }),
            ],
            responses: {
                200: jsonResponse('Paginated service list', ref('ServiceCatalogListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Service Catalog'],
            summary: 'Create a service catalog entry',
            requestBody: jsonRequest(ref('CreateServiceCatalogRequest')),
            responses: {
                201: jsonResponse('Service created', ref('ServiceCatalog')),
                ...commonErrorResponses,
                404: errorResponse('Department not found'),
            },
        }),
    },
    '/api/services/{id}': {
        get: operation({
            tags: ['Service Catalog'],
            summary: 'Get a service catalog entry by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Service details', ref('ServiceCatalog')),
                ...authResponses,
                404: errorResponse('Service not found'),
            },
        }),
        patch: operation({
            tags: ['Service Catalog'],
            summary: 'Update a service catalog entry',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateServiceCatalogRequest')),
            responses: {
                200: jsonResponse('Service updated', ref('ServiceCatalog')),
                ...commonErrorResponses,
                404: errorResponse('Service or department not found'),
            },
        }),
        put: operation({
            tags: ['Service Catalog'],
            summary: 'Update a service catalog entry',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateServiceCatalogRequest')),
            responses: {
                200: jsonResponse('Service updated', ref('ServiceCatalog')),
                ...commonErrorResponses,
                404: errorResponse('Service or department not found'),
            },
        }),
        delete: operation({
            tags: ['Service Catalog'],
            summary: 'Deactivate a service catalog entry',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Service deactivated', ref('ServiceCatalog')),
                ...authResponses,
                404: errorResponse('Service not found'),
                409: errorResponse('Service is referenced by active appointments'),
            },
        }),
    },

    '/api/staff-position-types': {
        get: operation({
            tags: ['Staff Position Types'],
            summary: 'List staff position types',
            parameters: [queryParam('isActive', { type: 'boolean' })],
            responses: {
                200: jsonResponse('Staff position type list', ref('StaffPositionTypeListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Staff Position Types'],
            summary: 'Create a staff position type',
            requestBody: jsonRequest(ref('CreateStaffPositionTypeRequest')),
            responses: {
                201: jsonResponse('Staff position type created', ref('StaffPositionType')),
                ...commonErrorResponses,
                409: errorResponse('Staff position type already exists'),
            },
        }),
    },
    '/api/staff-position-types/{id}': {
        get: operation({
            tags: ['Staff Position Types'],
            summary: 'Get a staff position type by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Staff position type details', ref('StaffPositionType')),
                ...authResponses,
                404: errorResponse('Staff position type not found'),
            },
        }),
        put: operation({
            tags: ['Staff Position Types'],
            summary: 'Update a staff position type',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateStaffPositionTypeRequest')),
            responses: {
                200: jsonResponse('Staff position type updated', ref('StaffPositionType')),
                ...commonErrorResponses,
                404: errorResponse('Staff position type not found'),
                409: errorResponse('Staff position type already exists'),
            },
        }),
        delete: operation({
            tags: ['Staff Position Types'],
            summary: 'Deactivate a staff position type',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Staff position type deactivated', ref('StaffPositionType')),
                ...authResponses,
                404: errorResponse('Staff position type not found'),
                409: errorResponse('Staff is assigned to this position type'),
            },
        }),
    },

    '/api/staff/public': {
        get: operation({
            tags: ['Staff'],
            summary: 'List public staff profiles',
            security: [],
            parameters: [
                ...pageParams,
                queryParam('departmentId', uuid),
                queryParam('positionTypeId', uuid),
                queryParam('search', { type: 'string' }),
            ],
            responses: {
                200: jsonResponse('Public staff list', ref('StaffProfileListResponse')),
            },
        }),
    },
    '/api/staff': {
        get: operation({
            tags: ['Staff'],
            summary: 'List staff profiles',
            parameters: [
                ...pageParams,
                queryParam('departmentId', uuid),
                queryParam('positionTypeId', uuid),
                queryParam('status', { type: 'string', enum: employmentStatuses }),
                queryParam('search', { type: 'string' }),
            ],
            responses: {
                200: jsonResponse('Staff profile list', ref('StaffProfileListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Staff'],
            summary: 'Create a staff profile',
            requestBody: jsonRequest(ref('CreateStaffProfileRequest')),
            responses: {
                201: jsonResponse('Staff profile created', ref('StaffProfile')),
                ...commonErrorResponses,
                404: errorResponse('Related resource not found'),
                409: errorResponse('Staff profile already exists'),
            },
        }),
    },
    '/api/staff/{id}': {
        get: operation({
            tags: ['Staff'],
            summary: 'Get a staff profile by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Staff profile details', ref('StaffProfile')),
                ...authResponses,
                404: errorResponse('Staff profile not found'),
            },
        }),
        put: operation({
            tags: ['Staff'],
            summary: 'Update a staff profile',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateStaffProfileRequest')),
            responses: {
                200: jsonResponse('Staff profile updated', ref('StaffProfile')),
                ...commonErrorResponses,
                404: errorResponse('Staff profile not found'),
            },
        }),
        delete: operation({
            tags: ['Staff'],
            summary: 'Deactivate a staff profile',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Staff profile deactivated', ref('StaffProfile')),
                ...authResponses,
                404: errorResponse('Staff profile not found'),
                409: errorResponse('Staff has future appointments'),
            },
        }),
    },
    '/api/staff/{id}/departments': {
        post: operation({
            tags: ['Staff'],
            summary: 'Assign a staff profile to a department',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('StaffDepartmentRequest')),
            responses: {
                200: jsonResponse('Department assignment updated', ref('StaffProfile')),
                ...commonErrorResponses,
                404: errorResponse('Staff or department not found'),
            },
        }),
        delete: operation({
            tags: ['Staff'],
            summary: 'Remove a staff profile department assignment',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('RemoveStaffDepartmentRequest')),
            responses: {
                200: jsonResponse('Department assignment removed', ref('StaffProfile')),
                ...commonErrorResponses,
                404: errorResponse('Staff or department not found'),
            },
        }),
    },
    '/api/staff/{id}/schedules': {
        get: operation({
            tags: ['Schedules'],
            summary: 'Get a staff weekly schedule',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Weekly schedule', ref('WeeklyScheduleResponse')),
                ...authResponses,
            },
        }),
        put: operation({
            tags: ['Schedules'],
            summary: 'Upsert a staff weekly schedule',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('WeeklyScheduleRequest')),
            responses: {
                200: jsonResponse('Weekly schedule updated', ref('WeeklyScheduleResponse')),
                ...commonErrorResponses,
            },
        }),
    },
    '/api/staff/{id}/schedule-exceptions': {
        get: operation({
            tags: ['Schedules'],
            summary: 'List staff schedule exceptions',
            parameters: [
                idParam(),
                queryParam('from', { type: 'string', format: 'date' }),
                queryParam('to', { type: 'string', format: 'date' }),
            ],
            responses: {
                200: jsonResponse('Schedule exceptions', arrayOf(ref('ScheduleException'))),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Schedules'],
            summary: 'Create a staff schedule exception',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('CreateScheduleExceptionRequest')),
            responses: {
                201: jsonResponse('Schedule exception created', ref('ScheduleException')),
                ...commonErrorResponses,
            },
        }),
        delete: operation({
            tags: ['Schedules'],
            summary: 'Delete a staff schedule exception by request body or query',
            parameters: [
                idParam(),
                queryParam('exceptionId', uuid),
            ],
            requestBody: jsonRequest(ref('DeleteScheduleExceptionRequest'), false),
            responses: {
                204: emptyResponse('Schedule exception deleted'),
                ...commonErrorResponses,
                404: errorResponse('Schedule exception not found'),
            },
        }),
    },
    '/api/staff/{id}/schedule-exceptions/{exceptionId}': {
        delete: operation({
            tags: ['Schedules'],
            summary: 'Delete a staff schedule exception',
            parameters: [
                idParam(),
                idParam('exceptionId', 'Schedule exception id'),
            ],
            responses: {
                204: emptyResponse('Schedule exception deleted'),
                ...authResponses,
                404: errorResponse('Schedule exception not found'),
            },
        }),
    },
    '/api/staff/{id}/available-slots': {
        get: operation({
            tags: ['Schedules'],
            summary: 'Get available appointment slots for a staff profile',
            parameters: [
                idParam(),
                queryParam('date', { type: 'string', format: 'date' }),
                queryParam('serviceId', uuid),
            ],
            responses: {
                200: jsonResponse('Available slots', arrayOf(ref('AvailableSlot'))),
                ...authResponses,
            },
        }),
    },

    '/api/patients': {
        get: operation({
            tags: ['Patients'],
            summary: 'List patients',
            parameters: [
                ...pageParams,
                queryParam('search', { type: 'string' }),
                queryParam('gender', { type: 'string' }),
                queryParam('bloodType', { type: 'string', enum: bloodTypes }),
            ],
            responses: {
                200: jsonResponse('Patient list', ref('PatientListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Patients'],
            summary: 'Create a patient',
            requestBody: jsonRequest(ref('CreatePatientRequest')),
            responses: {
                201: jsonResponse('Patient created', ref('Patient')),
                ...commonErrorResponses,
                409: errorResponse('Patient already exists'),
            },
        }),
    },
    '/api/patients/{id}': {
        get: operation({
            tags: ['Patients'],
            summary: 'Get a patient by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Patient details', ref('Patient')),
                ...authResponses,
                404: errorResponse('Patient not found'),
            },
        }),
        put: operation({
            tags: ['Patients'],
            summary: 'Update a patient',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdatePatientRequest')),
            responses: {
                200: jsonResponse('Patient updated', ref('Patient')),
                ...commonErrorResponses,
                404: errorResponse('Patient not found'),
            },
        }),
    },
    '/api/patients/{id}/timeline': {
        get: operation({
            tags: ['Patients'],
            summary: 'Get a patient timeline',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Patient timeline', ref('PatientTimelineResponse')),
                ...authResponses,
                404: errorResponse('Patient not found'),
            },
        }),
    },
    '/internal/patients/link-by-personal-number': {
        post: operation({
            tags: ['Internal Patients'],
            summary: 'Link an existing patient profile by personal number',
            security: [{ internalApiKey: [] }],
            requestBody: jsonRequest(ref('LinkPatientByPersonalNumberRequest')),
            responses: {
                200: jsonResponse(
                    'Patient link result',
                    ref('LinkPatientByPersonalNumberResponse'),
                ),
                400: errorResponse('Validation failed'),
                401: errorResponse('Invalid internal API key'),
                409: errorResponse('Patient link conflict'),
            },
        }),
    },

    '/api/appointments': {
        get: operation({
            tags: ['Appointments'],
            summary: 'List appointments',
            parameters: [
                ...pageParams,
                queryParam('date', { type: 'string', format: 'date' }),
                ...dateRangeParams,
                queryParam('staffId', uuid),
                queryParam('patientId', uuid),
                queryParam('departmentId', uuid),
                queryParam('status', { type: 'string', enum: appointmentStatuses }),
                queryParam('hasNoFeedback', { type: 'string', enum: ['true', 'false'] }),
            ],
            responses: {
                200: jsonResponse('Appointment list', ref('AppointmentListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Appointments'],
            summary: 'Book an appointment',
            requestBody: jsonRequest(ref('BookAppointmentRequest')),
            responses: {
                201: jsonResponse('Appointment booked', ref('Appointment')),
                ...commonErrorResponses,
                409: errorResponse('Selected slot is unavailable'),
            },
        }),
    },
    '/api/appointments/today': {
        get: operation({
            tags: ['Appointments'],
            summary: 'List today appointments',
            responses: {
                200: jsonResponse('Today appointment list', arrayOf(ref('Appointment'))),
                ...authResponses,
            },
        }),
    },
    '/api/appointments/{id}': {
        get: operation({
            tags: ['Appointments'],
            summary: 'Get an appointment by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Appointment details', ref('Appointment')),
                ...authResponses,
                404: errorResponse('Appointment not found'),
            },
        }),
        put: operation({
            tags: ['Appointments'],
            summary: 'Reschedule an appointment',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('RescheduleAppointmentRequest')),
            responses: {
                200: jsonResponse('Appointment rescheduled', ref('Appointment')),
                ...commonErrorResponses,
                409: errorResponse('Selected slot is unavailable'),
            },
        }),
        patch: operation({
            tags: ['Appointments'],
            summary: 'Reschedule an appointment',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('RescheduleAppointmentRequest')),
            responses: {
                200: jsonResponse('Appointment rescheduled', ref('Appointment')),
                ...commonErrorResponses,
                409: errorResponse('Selected slot is unavailable'),
            },
        }),
    },
    '/api/appointments/{id}/status': {
        patch: operation({
            tags: ['Appointments'],
            summary: 'Update appointment status',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateAppointmentStatusRequest')),
            responses: {
                200: jsonResponse('Appointment status updated', ref('Appointment')),
                ...commonErrorResponses,
                404: errorResponse('Appointment not found'),
            },
        }),
    },
    '/internal/appointments/reminders': {
        get: operation({
            tags: ['Internal Appointments'],
            summary: 'List appointment reminder candidates',
            security: [{ internalApiKey: [] }],
            parameters: dateRangeParams,
            responses: {
                200: jsonResponse('Reminder candidates', objectSchema({ data: arrayOf(ref('Appointment')) })),
                401: errorResponse('Invalid internal API key'),
            },
        }),
    },

    '/api/medical-records': {
        get: operation({
            tags: ['Medical Records'],
            summary: 'List medical records',
            parameters: [
                ...pageParams,
                queryParam('patientId', uuid),
                queryParam('isFinalized', { type: 'string', enum: ['true', 'false'] }),
            ],
            responses: {
                200: jsonResponse('Medical record list', ref('MedicalRecordListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Medical Records'],
            summary: 'Create a medical record',
            requestBody: jsonRequest(ref('CreateMedicalRecordRequest')),
            responses: {
                201: jsonResponse('Medical record created', ref('MedicalRecord')),
                ...commonErrorResponses,
            },
        }),
    },
    '/api/medical-records/{id}': {
        get: operation({
            tags: ['Medical Records'],
            summary: 'Get a medical record by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Medical record details', ref('MedicalRecord')),
                ...authResponses,
                404: errorResponse('Medical record not found'),
            },
        }),
        put: operation({
            tags: ['Medical Records'],
            summary: 'Update a medical record',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateMedicalRecordRequest')),
            responses: {
                200: jsonResponse('Medical record updated', ref('MedicalRecord')),
                ...commonErrorResponses,
                404: errorResponse('Medical record not found'),
            },
        }),
        patch: operation({
            tags: ['Medical Records'],
            summary: 'Update a medical record',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateMedicalRecordRequest')),
            responses: {
                200: jsonResponse('Medical record updated', ref('MedicalRecord')),
                ...commonErrorResponses,
                404: errorResponse('Medical record not found'),
            },
        }),
    },
    '/api/medical-records/{id}/pdf': {
        get: operation({
            tags: ['Medical Records'],
            summary: 'Download a medical record PDF',
            parameters: [idParam()],
            responses: {
                200: fileResponse('Medical record PDF', 'application/pdf'),
                ...authResponses,
                404: errorResponse('Medical record not found'),
            },
        }),
    },
    '/api/medical-records/{id}/finalize': {
        post: operation({
            tags: ['Medical Records'],
            summary: 'Finalize a medical record',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Medical record finalized', ref('MedicalRecord')),
                ...authResponses,
                404: errorResponse('Medical record not found'),
                409: errorResponse('Medical record already finalized'),
            },
        }),
    },
    '/api/medical-records/{id}/amendments': {
        post: operation({
            tags: ['Medical Records'],
            summary: 'Add a medical record amendment',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('AddMedicalRecordAmendmentRequest')),
            responses: {
                201: jsonResponse('Medical record amendment added', ref('MedicalRecord')),
                ...commonErrorResponses,
                404: errorResponse('Medical record not found'),
            },
        }),
    },

    '/api/prescriptions': {
        get: operation({
            tags: ['Prescriptions'],
            summary: 'List prescriptions',
            parameters: [
                ...pageParams,
                queryParam('patientId', uuid),
                queryParam('isVoided', { type: 'string', enum: ['true', 'false'] }),
            ],
            responses: {
                200: jsonResponse('Prescription list', ref('PrescriptionListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Prescriptions'],
            summary: 'Create a prescription',
            requestBody: jsonRequest(ref('CreatePrescriptionRequest')),
            responses: {
                201: jsonResponse('Prescription created', ref('Prescription')),
                ...commonErrorResponses,
            },
        }),
    },
    '/api/prescriptions/{id}': {
        get: operation({
            tags: ['Prescriptions'],
            summary: 'Get a prescription by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Prescription details', ref('Prescription')),
                ...authResponses,
                404: errorResponse('Prescription not found'),
            },
        }),
    },
    '/api/prescriptions/{id}/pdf': {
        get: operation({
            tags: ['Prescriptions'],
            summary: 'Download a prescription PDF',
            parameters: [idParam()],
            responses: {
                200: fileResponse('Prescription PDF', 'application/pdf'),
                ...authResponses,
                404: errorResponse('Prescription not found'),
            },
        }),
    },
    '/api/prescriptions/{id}/void': {
        post: operation({
            tags: ['Prescriptions'],
            summary: 'Void a prescription',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('VoidPrescriptionRequest')),
            responses: {
                200: jsonResponse('Prescription voided', ref('Prescription')),
                ...commonErrorResponses,
                404: errorResponse('Prescription not found'),
            },
        }),
    },

    '/api/lab-tests': {
        get: operation({
            tags: ['Lab Tests'],
            summary: 'List lab tests',
            parameters: [
                ...pageParams,
                queryParam('search', { type: 'string' }),
                queryParam('category', { type: 'string' }),
                queryParam('isActive', { type: 'string', enum: ['true', 'false'] }),
            ],
            responses: {
                200: jsonResponse('Lab test list', ref('LabTestListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Lab Tests'],
            summary: 'Create a lab test',
            requestBody: jsonRequest(ref('CreateLabTestRequest')),
            responses: {
                201: jsonResponse('Lab test created', ref('LabTest')),
                ...commonErrorResponses,
                409: errorResponse('Lab test code already exists'),
            },
        }),
    },
    '/api/lab-tests/{id}': {
        get: operation({
            tags: ['Lab Tests'],
            summary: 'Get a lab test by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Lab test details', ref('LabTest')),
                ...authResponses,
                404: errorResponse('Lab test not found'),
            },
        }),
        patch: operation({
            tags: ['Lab Tests'],
            summary: 'Update a lab test',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateLabTestRequest')),
            responses: {
                200: jsonResponse('Lab test updated', ref('LabTest')),
                ...commonErrorResponses,
                404: errorResponse('Lab test not found'),
            },
        }),
        put: operation({
            tags: ['Lab Tests'],
            summary: 'Update a lab test',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateLabTestRequest')),
            responses: {
                200: jsonResponse('Lab test updated', ref('LabTest')),
                ...commonErrorResponses,
                404: errorResponse('Lab test not found'),
            },
        }),
        delete: operation({
            tags: ['Lab Tests'],
            summary: 'Deactivate a lab test',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Lab test deactivated', ref('LabTest')),
                ...authResponses,
                404: errorResponse('Lab test not found'),
            },
        }),
    },
    '/api/lab-orders': {
        get: operation({
            tags: ['Lab Orders'],
            summary: 'List lab orders',
            parameters: [
                ...pageParams,
                queryParam('patientId', uuid),
                queryParam('status', { type: 'string', enum: labOrderStatusInputs }),
                queryParam('priority', { type: 'string', enum: ['normal', 'urgent'] }),
                ...dateRangeParams,
            ],
            responses: {
                200: jsonResponse('Lab order list', ref('LabOrderListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Lab Orders'],
            summary: 'Create a lab order',
            requestBody: jsonRequest(ref('CreateLabOrderRequest')),
            responses: {
                201: jsonResponse('Lab order created', ref('LabOrder')),
                ...commonErrorResponses,
            },
        }),
    },
    '/api/lab-orders/pending': {
        get: operation({
            tags: ['Lab Orders'],
            summary: 'List pending lab orders',
            responses: {
                200: jsonResponse('Pending lab orders', arrayOf(ref('LabOrder'))),
                ...authResponses,
            },
        }),
    },
    '/api/lab-orders/{id}': {
        get: operation({
            tags: ['Lab Orders'],
            summary: 'Get a lab order by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Lab order details', ref('LabOrder')),
                ...authResponses,
                404: errorResponse('Lab order not found'),
            },
        }),
    },
    '/api/lab-orders/{id}/status': {
        patch: operation({
            tags: ['Lab Orders'],
            summary: 'Update lab order status',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateLabOrderStatusRequest')),
            responses: {
                200: jsonResponse('Lab order status updated', ref('LabOrder')),
                ...commonErrorResponses,
                404: errorResponse('Lab order not found'),
            },
        }),
    },
    '/api/lab-orders/{id}/results': {
        put: operation({
            tags: ['Lab Orders'],
            summary: 'Enter lab order results',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('EnterLabOrderResultsRequest')),
            responses: {
                200: jsonResponse('Lab order results entered', ref('LabOrder')),
                ...commonErrorResponses,
                404: errorResponse('Lab order not found'),
            },
        }),
    },
    '/api/lab-orders/{id}/review': {
        post: operation({
            tags: ['Lab Orders'],
            summary: 'Review lab order results',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('ReviewLabOrderRequest'), false),
            responses: {
                200: jsonResponse('Lab order reviewed', ref('LabOrder')),
                ...commonErrorResponses,
                404: errorResponse('Lab order not found'),
            },
        }),
    },
    '/api/lab-orders/{id}/trigger-ai': {
        post: operation({
            tags: ['Lab Orders'],
            summary: 'Trigger AI interpretation for a lab order',
            description: 'Queues AI lab interpretation through the AI Service internal endpoint. Automatic queueing also runs when a lab order is completed.',
            parameters: [idParam()],
            responses: {
                202: jsonResponse('AI interpretation trigger queued or not configured', ref('TriggerAiResponse')),
                ...authResponses,
                409: errorResponse('Lab order must be completed with all results'),
                404: errorResponse('Lab order not found'),
            },
        }),
    },

    '/api/billings': {
        get: operation({
            tags: ['Billing'],
            summary: 'List billings',
            parameters: [
                ...pageParams,
                queryParam('patientId', uuid),
                queryParam('status', { type: 'string', enum: billingStatuses }),
                ...dateRangeParams,
            ],
            responses: {
                200: jsonResponse('Billing list', ref('BillingListResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/billings/stats': {
        get: operation({
            tags: ['Billing'],
            summary: 'Get billing statistics',
            parameters: dateRangeParams,
            responses: {
                200: jsonResponse('Billing statistics', ref('BillingStats')),
                ...authResponses,
            },
        }),
    },
    '/api/billings/{id}': {
        get: operation({
            tags: ['Billing'],
            summary: 'Get a billing by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Billing details', ref('Billing')),
                ...authResponses,
                404: errorResponse('Billing not found'),
            },
        }),
        put: operation({
            tags: ['Billing'],
            summary: 'Update a billing',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateBillingRequest')),
            responses: {
                200: jsonResponse('Billing updated', ref('Billing')),
                ...commonErrorResponses,
                404: errorResponse('Billing not found'),
            },
        }),
    },
    '/api/billings/{id}/pdf': {
        get: operation({
            tags: ['Billing'],
            summary: 'Download a billing PDF',
            parameters: [idParam()],
            responses: {
                200: fileResponse('Billing PDF', 'application/pdf'),
                ...authResponses,
                404: errorResponse('Billing not found'),
            },
        }),
    },
    '/api/billings/{id}/payments': {
        post: operation({
            tags: ['Billing'],
            summary: 'Record a billing payment',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('RecordPaymentRequest')),
            responses: {
                201: jsonResponse('Payment recorded', ref('Billing')),
                ...commonErrorResponses,
                404: errorResponse('Billing not found'),
            },
        }),
    },

    '/api/pharmacy/queue': {
        get: operation({
            tags: ['Pharmacy'],
            summary: 'List pharmacy queue items',
            parameters: [
                ...pageParams,
                queryParam('status', {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'on_hold', 'partially_dispensed', 'dispensed', 'fulfilled', 'cancelled'],
                }),
            ],
            responses: {
                200: jsonResponse('Pharmacy queue list', ref('PharmacyQueueListResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/pharmacy/queue/{id}': {
        get: operation({
            tags: ['Pharmacy'],
            summary: 'Get a pharmacy queue item by id',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Pharmacy queue details', ref('PharmacyQueue')),
                ...authResponses,
                404: errorResponse('Pharmacy queue item not found'),
            },
        }),
    },
    '/api/pharmacy/queue/{id}/start': {
        patch: operation({
            tags: ['Pharmacy'],
            summary: 'Start processing a pharmacy queue item',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Pharmacy queue item started', ref('PharmacyQueue')),
                ...authResponses,
                404: errorResponse('Pharmacy queue item not found'),
            },
        }),
    },
    '/api/pharmacy/queue/{id}/dispense': {
        post: operation({
            tags: ['Pharmacy'],
            summary: 'Dispense pharmacy queue items',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('DispensePharmacyQueueRequest')),
            responses: {
                200: jsonResponse('Pharmacy queue item dispensed', ref('PharmacyQueue')),
                ...commonErrorResponses,
                404: errorResponse('Pharmacy queue item not found'),
            },
        }),
    },
    '/api/pharmacy/queue/{id}/fulfill': {
        patch: operation({
            tags: ['Pharmacy'],
            summary: 'Fulfill a pharmacy queue item',
            parameters: [idParam()],
            responses: {
                200: jsonResponse('Pharmacy queue item fulfilled', ref('PharmacyQueue')),
                ...authResponses,
                404: errorResponse('Pharmacy queue item not found'),
                409: errorResponse('Queue item cannot be fulfilled yet'),
            },
        }),
    },

    '/api/dashboard/stats': {
        get: operation({
            tags: ['Dashboard'],
            summary: 'Get dashboard summary statistics',
            responses: {
                200: jsonResponse('Dashboard statistics', ref('DashboardStats')),
                ...authResponses,
            },
        }),
    },

    '/api/reports/appointments': {
        get: operation({
            tags: ['Reports'],
            summary: 'Generate appointments report',
            parameters: reportParams,
            responses: {
                200: jsonResponse('Appointments report', ref('ReportResult')),
                ...authResponses,
            },
        }),
    },
    '/api/reports/clinical': {
        get: operation({
            tags: ['Reports'],
            summary: 'Generate clinical report',
            parameters: reportParams,
            responses: {
                200: jsonResponse('Clinical report', ref('ReportResult')),
                ...authResponses,
            },
        }),
    },
    '/api/reports/financial': {
        get: operation({
            tags: ['Reports'],
            summary: 'Generate financial report',
            parameters: reportParams,
            responses: {
                200: jsonResponse('Financial report', ref('ReportResult')),
                ...authResponses,
            },
        }),
    },
    '/api/reports/inventory': {
        get: operation({
            tags: ['Reports'],
            summary: 'Generate inventory report',
            parameters: reportParams,
            responses: {
                200: jsonResponse('Inventory report', ref('ReportResult')),
                ...authResponses,
            },
        }),
    },
    '/api/reports/patients': {
        get: operation({
            tags: ['Reports'],
            summary: 'Generate patients report',
            parameters: reportParams,
            responses: {
                200: jsonResponse('Patients report', ref('ReportResult')),
                ...authResponses,
            },
        }),
    },
    '/api/reports/staff-workload': {
        get: operation({
            tags: ['Reports'],
            summary: 'Generate staff workload report',
            parameters: reportParams,
            responses: {
                200: jsonResponse('Staff workload report', ref('ReportResult')),
                ...authResponses,
            },
        }),
    },
    '/api/reports/templates': {
        get: operation({
            tags: ['Reports'],
            summary: 'List report templates',
            parameters: [queryParam('reportType', { type: 'string', enum: reportTypes })],
            responses: {
                200: jsonResponse('Report template list', ref('ReportTemplateListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Reports'],
            summary: 'Save a report template',
            requestBody: jsonRequest(ref('SaveReportTemplateRequest')),
            responses: {
                201: jsonResponse('Report template saved', ref('ReportTemplate')),
                ...commonErrorResponses,
            },
        }),
    },

    '/api/search/patients': {
        get: operation({
            tags: ['Search'],
            summary: 'Advanced search patients',
            parameters: [
                ...commonSearchParams,
                queryParam('gender', { type: 'string' }),
                queryParam('minAge', { type: 'integer', minimum: 0, maximum: 130 }),
                queryParam('maxAge', { type: 'integer', minimum: 0, maximum: 130 }),
                queryParam('bloodType', { type: 'string', enum: bloodTypes }),
            ],
            responses: {
                200: jsonResponse('Patient search results', ref('SearchResultResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/search/appointments': {
        get: operation({
            tags: ['Search'],
            summary: 'Advanced search appointments',
            parameters: [
                ...commonSearchParams,
                queryParam('status', { type: 'string', enum: appointmentStatuses }),
                ...dateRangeParams,
                queryParam('departmentId', uuid),
                queryParam('serviceId', uuid),
                queryParam('serviceCatalogId', uuid),
            ],
            responses: {
                200: jsonResponse('Appointment search results', ref('SearchResultResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/search/lab-orders': {
        get: operation({
            tags: ['Search'],
            summary: 'Advanced search lab orders',
            parameters: [
                ...commonSearchParams,
                queryParam('status', { type: 'string', enum: ['PENDING', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'pending', 'collected', 'in_progress', 'completed', 'cancelled'] }),
                queryParam('priority', { type: 'string' }),
                ...dateRangeParams,
                queryParam('hasCritical', { type: 'string', enum: ['true', 'false'] }),
            ],
            responses: {
                200: jsonResponse('Lab order search results', ref('SearchResultResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/search/inventory-items': {
        get: operation({
            tags: ['Search'],
            summary: 'Advanced search inventory items',
            parameters: [
                ...commonSearchParams,
                queryParam('categoryId', uuid),
                queryParam('category', { type: 'string' }),
                queryParam('stockLevel', { type: 'string', enum: ['out_of_stock', 'low', 'in_stock'] }),
                queryParam('departmentId', uuid),
                queryParam('expiryFrom', { type: 'string', format: 'date-time' }),
                queryParam('expiryTo', { type: 'string', format: 'date-time' }),
            ],
            responses: {
                200: jsonResponse('Inventory item search results', ref('SearchResultResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/search/staff': {
        get: operation({
            tags: ['Search'],
            summary: 'Advanced search staff',
            parameters: [
                ...commonSearchParams,
                queryParam('departmentId', uuid),
                queryParam('positionTypeId', uuid),
                queryParam('status', { type: 'string', enum: employmentStatuses }),
            ],
            responses: {
                200: jsonResponse('Staff search results', ref('SearchResultResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/search/audit-logs': {
        get: operation({
            tags: ['Search'],
            summary: 'Advanced search audit logs',
            parameters: [
                ...commonSearchParams,
                queryParam('userId', uuid),
                queryParam('action', { type: 'string' }),
                queryParam('entity', { type: 'string' }),
                ...dateRangeParams,
                queryParam('ip', { type: 'string' }),
            ],
            responses: {
                200: jsonResponse('Audit log search results', ref('SearchResultResponse')),
                ...authResponses,
            },
        }),
    },

    '/api/export/{entity}': {
        get: operation({
            tags: ['Data Exchange'],
            summary: 'Export an entity dataset',
            parameters: [
                stringParam('entity', 'Export entity'),
                queryParam('format', { type: 'string', enum: exchangeFormats, default: 'csv' }),
            ],
            responses: {
                200: fileResponse('Export file', 'application/octet-stream'),
                ...authResponses,
                400: errorResponse('Unsupported entity or format'),
            },
        }),
    },
    '/api/import/template/{entity}': {
        get: operation({
            tags: ['Data Exchange'],
            summary: 'Download an import template',
            parameters: [
                stringParam('entity', 'Import entity'),
                queryParam('format', { type: 'string', enum: exchangeFormats, default: 'csv' }),
            ],
            responses: {
                200: fileResponse('Import template file', 'application/octet-stream'),
                ...authResponses,
                400: errorResponse('Unsupported entity or format'),
            },
        }),
    },
    '/api/import/jobs/{jobId}': {
        get: operation({
            tags: ['Data Exchange'],
            summary: 'Get an import job',
            parameters: [idParam('jobId', 'Import job id')],
            responses: {
                200: jsonResponse('Import job', ref('ImportJob')),
                ...authResponses,
                404: errorResponse('Import job not found'),
            },
        }),
    },
    '/api/import/{entity}': {
        post: operation({
            tags: ['Data Exchange'],
            summary: 'Import entity data',
            parameters: [
                stringParam('entity', 'Import entity'),
                queryParam('format', { type: 'string', enum: exchangeFormats }),
                queryParam('mode', { type: 'string', enum: ['strict', 'lenient'], default: 'strict' }),
                queryParam('async', { type: 'string', enum: ['true', 'false'] }),
            ],
            requestBody: multipartImportRequest,
            responses: {
                200: jsonResponse('Import completed', ref('ImportResult')),
                202: jsonResponse('Import queued', ref('ImportJob')),
                ...commonErrorResponses,
            },
        }),
    },

    '/api/feedback': {
        get: operation({
            tags: ['Feedback'],
            summary: 'List feedback',
            parameters: [
                ...pageParams,
                queryParam('staffProfileId', uuid),
                queryParam('departmentId', uuid),
                queryParam('status', { type: 'string', enum: ['pending', 'published', 'hidden'] }),
            ],
            responses: {
                200: jsonResponse('Feedback list', ref('FeedbackListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Feedback'],
            summary: 'Submit feedback',
            requestBody: jsonRequest(ref('SubmitFeedbackRequest')),
            responses: {
                201: jsonResponse('Feedback submitted', ref('Feedback')),
                ...commonErrorResponses,
                409: errorResponse('Feedback already exists for appointment'),
            },
        }),
    },
    '/api/feedback/my': {
        get: operation({
            tags: ['Feedback'],
            summary: 'List my feedback',
            parameters: pageParams,
            responses: {
                200: jsonResponse('My feedback list', ref('FeedbackListResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/feedback/{id}/status': {
        patch: operation({
            tags: ['Feedback'],
            summary: 'Update feedback status',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateFeedbackStatusRequest')),
            responses: {
                200: jsonResponse('Feedback status updated', ref('Feedback')),
                ...commonErrorResponses,
                404: errorResponse('Feedback not found'),
            },
        }),
    },

    '/api/contact': {
        get: operation({
            tags: ['Contact'],
            summary: 'List contact messages',
            parameters: [
                ...pageParams,
                queryParam('status', { type: 'string', enum: ['new', 'read', 'replied'] }),
                queryParam('search', {
                    type: 'string',
                    description: 'Search sender name, email, or phone.',
                }),
                queryParam('createdAtFrom', {
                    type: 'string',
                    format: 'date',
                    description: 'Received date lower bound.',
                }),
                queryParam('createdAtTo', {
                    type: 'string',
                    format: 'date',
                    description: 'Received date upper bound.',
                }),
            ],
            responses: {
                200: jsonResponse('Contact message list', ref('ContactMessageListResponse')),
                ...authResponses,
            },
        }),
        post: operation({
            tags: ['Contact'],
            summary: 'Submit a public contact message',
            security: [],
            requestBody: jsonRequest(ref('SubmitContactMessageRequest')),
            responses: {
                201: jsonResponse('Contact message submitted', ref('ContactMessage')),
                400: errorResponse('Validation failed'),
            },
        }),
    },
    '/api/contact/{id}/status': {
        patch: operation({
            tags: ['Contact'],
            summary: 'Update contact message status or send a reply',
            parameters: [idParam()],
            requestBody: jsonRequest(ref('UpdateContactStatusRequest')),
            responses: {
                200: jsonResponse('Contact message status updated', ref('ContactMessage')),
                ...commonErrorResponses,
                404: errorResponse('Contact message not found'),
            },
        }),
    },

    '/api/settings': {
        get: operation({
            tags: ['Settings'],
            summary: 'Get platform settings grouped by category',
            responses: {
                200: jsonResponse('Grouped settings', ref('GroupedSettingsResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/public/settings': {
        get: operation({
            tags: ['Settings'],
            summary: 'Get public website settings grouped by category',
            security: [],
            responses: {
                200: jsonResponse('Public grouped settings', ref('GroupedSettingsResponse')),
            },
        }),
    },
    '/api/settings/bulk': {
        put: operation({
            tags: ['Settings'],
            summary: 'Update multiple settings at once',
            requestBody: jsonRequest(ref('BulkUpdateSettingsRequest')),
            responses: {
                200: jsonResponse('Updated settings', ref('BulkUpdateSettingsResponse')),
                ...commonErrorResponses,
            },
        }),
    },
    '/api/settings/{key}': {
        put: operation({
            tags: ['Settings'],
            summary: 'Update a single setting',
            parameters: [stringParam('key', 'Setting key')],
            requestBody: jsonRequest(ref('UpdateSettingRequest')),
            responses: {
                200: jsonResponse('Updated setting', ref('GroupedSettingItem')),
                ...commonErrorResponses,
                404: errorResponse('Setting not found'),
            },
        }),
    },

    '/api/audit-logs': {
        get: operation({
            tags: ['Audit Logs'],
            summary: 'List audit logs',
            parameters: [
                ...pageParams,
                queryParam('action', { type: 'string' }),
                queryParam('entity', { type: 'string' }),
                queryParam('userId', uuid),
                ...dateRangeParams,
                queryParam('ip', { type: 'string' }),
            ],
            responses: {
                200: jsonResponse('Audit log list', ref('AuditLogListResponse')),
                ...authResponses,
            },
        }),
    },
    '/api/audit-logs/export': {
        get: operation({
            tags: ['Audit Logs'],
            summary: 'Export audit logs as CSV',
            parameters: [
                queryParam('format', { type: 'string', enum: ['csv'] }),
                queryParam('action', { type: 'string' }),
                queryParam('entity', { type: 'string' }),
                queryParam('userId', uuid),
                ...dateRangeParams,
                queryParam('ip', { type: 'string' }),
            ],
            responses: {
                200: fileResponse('CSV audit log export', 'text/csv'),
                ...authResponses,
            },
        }),
    },
};

export const swaggerSpec = {
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
            description: 'Docker/local development',
        },
        {
            url: 'http://localhost:3006',
            description: 'Native local development default',
        },
    ],
    security: [{ bearerAuth: [] }],
    tags: [
        { name: 'Health' },
        { name: 'Departments' },
        { name: 'Service Catalog' },
        { name: 'Staff Position Types' },
        { name: 'Staff' },
        { name: 'Schedules' },
        { name: 'Patients' },
        { name: 'Appointments' },
        { name: 'Internal Appointments' },
        { name: 'Medical Records' },
        { name: 'Prescriptions' },
        { name: 'Lab Tests' },
        { name: 'Lab Orders' },
        { name: 'Billing' },
        { name: 'Pharmacy' },
        { name: 'Dashboard' },
        { name: 'Reports' },
        { name: 'Search' },
        { name: 'Data Exchange' },
        { name: 'Feedback' },
        { name: 'Contact' },
        { name: 'Settings' },
        { name: 'Audit Logs' },
        { name: 'Internal Patients' },
    ],
    paths,
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            internalApiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'x-internal-api-key',
            },
        },
        schemas,
    },
};
