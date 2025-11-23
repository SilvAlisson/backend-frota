export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const formatDateToInput = (date: Date | null | undefined): string | null => {
    if (!date) return null;
    const d = new Date(date);
    // Garante UTC para evitar problemas de fuso horário
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return dataCorrigida.toISOString().split('T')[0] as string;
};