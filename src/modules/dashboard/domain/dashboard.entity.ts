export interface DashboardAppointmentCounts {
    scheduled: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShow: number;
    total: number;
}

export interface DashboardRevenue {
    today: number;
    week: number;
    month: number;
}

export interface DashboardRevenueTrendPoint {
    date: string;
    total: number;
}

export interface DashboardStats {
    appointments: DashboardAppointmentCounts;
    checkedInPatients: number;
    pendingLabOrders: number;
    lowStockItems: number;
    revenue: DashboardRevenue;
    revenueTrend: DashboardRevenueTrendPoint[];
    updatedAt: Date;
}
